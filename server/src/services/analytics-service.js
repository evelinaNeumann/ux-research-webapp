import { Answer } from '../models/Answer.js';
import { ImageRating } from '../models/ImageRating.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { ImageTaskResponse } from '../models/ImageTaskResponse.js';
import { CardSort } from '../models/CardSort.js';
import { Session } from '../models/Session.js';
import { Question } from '../models/Question.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { Card } from '../models/Card.js';
import { CardSortColumn } from '../models/CardSortColumn.js';
import { ResearchTask } from '../models/ResearchTask.js';
import { TaskResponse } from '../models/TaskResponse.js';
import { Study } from '../models/Study.js';
import mongoose from 'mongoose';

function buildSessionMatch(filters = {}) {
  const match = {};
  if (filters.userId) match.user_id = filters.userId;
  if (filters.dateFrom || filters.dateTo) {
    match.createdAt = {};
    if (filters.dateFrom) match.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) match.createdAt.$lte = new Date(filters.dateTo);
  }
  return match;
}

export async function resolveStudyScopeIds(studyId) {
  if (!studyId) return [];
  if (!mongoose.Types.ObjectId.isValid(studyId)) return [studyId];

  const study = await Study.findById(studyId, { _id: 1, composed_sections: 1 }).lean();
  if (!study) return [new mongoose.Types.ObjectId(studyId)];

  const sectionIds = Array.isArray(study.composed_sections)
    ? study.composed_sections.map((entry) => entry?.study_id).filter(Boolean)
    : [];
  const unique = [study._id, ...sectionIds].map((id) => String(id));
  return Array.from(new Set(unique)).map((id) => new mongoose.Types.ObjectId(id));
}

async function resolveAnalyticsScope(studyId) {
  if (!studyId) return { studyScopeIds: [], mixedFlowStudyId: null };
  if (!mongoose.Types.ObjectId.isValid(studyId)) {
    return { studyScopeIds: [studyId], mixedFlowStudyId: null };
  }

  const study = await Study.findById(studyId, { _id: 1, composed_sections: 1 }).lean();
  if (!study) return { studyScopeIds: [new mongoose.Types.ObjectId(studyId)], mixedFlowStudyId: null };

  const sectionIds = Array.isArray(study.composed_sections)
    ? study.composed_sections.map((entry) => entry?.study_id).filter(Boolean)
    : [];
  if (sectionIds.length === 0) {
    return { studyScopeIds: [study._id], mixedFlowStudyId: null };
  }

  return {
    studyScopeIds: Array.from(new Set(sectionIds.map((id) => String(id)))).map((id) => new mongoose.Types.ObjectId(id)),
    mixedFlowStudyId: study._id,
  };
}

function toSortedRows(obj, keyName = 'key') {
  return Object.entries(obj)
    .map(([key, count]) => ({ [keyName]: key, count }))
    .sort((a, b) => b.count - a.count || String(a[keyName]).localeCompare(String(b[keyName]), 'de-DE'));
}

function hasProfileFilters(filters = {}) {
  return Boolean(filters.age || filters.role || filters.keyword);
}

async function resolveFilteredUserIds(filters = {}, studyScopeIds = []) {
  if (!hasProfileFilters(filters)) return null;

  const match = {};
  if (studyScopeIds.length > 0) match.study_id = { $in: studyScopeIds };
  if (filters.age) match.age_range = String(filters.age);
  if (filters.role) {
    const roleValue = String(filters.role);
    if (roleValue.startsWith('other:')) {
      match.role_category = 'other';
      match.role_custom = roleValue.slice('other:'.length);
    } else {
      match.role_category = roleValue;
    }
  }
  if (filters.keyword) {
    match.key_points = String(filters.keyword);
  }

  const profiles = await UserStudyProfile.find(match, { user_id: 1 }).lean();
  const uniqueIds = [...new Set(profiles.map((p) => String(p.user_id)))];
  return uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
}

export async function analyticsOverview(filters = {}) {
  const sessionMatch = buildSessionMatch(filters);
  const { studyScopeIds, mixedFlowStudyId } = await resolveAnalyticsScope(filters.studyId);
  if (studyScopeIds.length > 0) sessionMatch.study_id = { $in: studyScopeIds };
  if (mixedFlowStudyId) sessionMatch.flow_study_id = mixedFlowStudyId;
  const filteredUserIds = await resolveFilteredUserIds(filters, studyScopeIds);
  if (filteredUserIds) {
    sessionMatch.user_id = { $in: filteredUserIds };
  }
  if (filteredUserIds && filteredUserIds.length === 0) {
    return {
      sessions_total: 0,
      sessions_done: 0,
      completion_rate: 0,
      questionnaire: [],
      questionnaire_questions_total: 0,
      image_rating: [],
      image_assets_total: 0,
      card_sort_submissions: 0,
      task_work: {
        submissions_total: 0,
        tasks: [],
      },
    };
  }

  const scopedSessions = mixedFlowStudyId
    ? await Session.find(sessionMatch, { _id: 1 }).lean()
    : [];
  const scopedSessionIds = scopedSessions.map((row) => row._id);

  const [sessionsTotal, sessionsDone] = await Promise.all([
    Session.countDocuments(sessionMatch),
    Session.countDocuments({ ...sessionMatch, status: 'done' }),
  ]);

  const answerMatch = studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {};
  if (mixedFlowStudyId) answerMatch.session_id = { $in: scopedSessionIds };
  if (filteredUserIds) answerMatch.user_id = { $in: filteredUserIds };
  const [questionDocs, answerDocs] = await Promise.all([
    Question.find(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {}, { _id: 1, text: 1 }).sort({ _id: 1 }).lean(),
    Answer.aggregate([
      { $match: answerMatch },
      { $sort: { created_at: -1, _id: -1 } },
      {
        $group: {
          _id: { session_id: '$session_id', question_id: '$question_id' },
          question_id: { $first: '$question_id' },
          response: { $first: '$response' },
        },
      },
      {
        $project: {
          _id: 0,
          question_id: 1,
          response: 1,
        },
      },
    ]),
  ]);

  const questionTextById = new Map(questionDocs.map((q) => [String(q._id), q.text || '']));
  const answersByQuestion = new Map();
  for (const a of answerDocs) {
    const key = String(a.question_id);
    if (!answersByQuestion.has(key)) answersByQuestion.set(key, []);
    answersByQuestion.get(key).push(a.response);
  }

  const questionnaire = questionDocs.map((q) => {
    const key = String(q._id);
    const responses = answersByQuestion.get(key) || [];
    const normalized = responses
      .map((r) => (r === null || r === undefined ? '' : String(r).trim()))
      .filter(Boolean);
    const frequencyMap = {};
    const displayByNorm = {};
    for (const answer of normalized) {
      const norm = answer.toLocaleLowerCase('de-DE');
      if (!displayByNorm[norm]) displayByNorm[norm] = answer;
      frequencyMap[norm] = (frequencyMap[norm] || 0) + 1;
    }
    const answer_distribution = Object.entries(frequencyMap)
      .map(([norm, count]) => ({ value: displayByNorm[norm] || norm, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value), 'de-DE'))
      .slice(0, 20);

    return {
      _id: q._id,
      question_text: questionTextById.get(key) || '',
      n: normalized.length,
      answers: normalized,
      answer_distribution,
    };
  });

  const imageMatch = studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {};
  if (mixedFlowStudyId) imageMatch.session_id = { $in: scopedSessionIds };
  if (filteredUserIds) imageMatch.user_id = { $in: filteredUserIds };
  const imageAvg = await ImageRating.aggregate([
    { $match: imageMatch },
    {
      $group: {
        _id: '$image_id',
        avg: { $avg: '$rating' },
        n: { $sum: 1 },
      },
    },
  ]);

  const cardSortMatch = studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {};
  if (mixedFlowStudyId) cardSortMatch.session_id = { $in: scopedSessionIds };
  if (filteredUserIds) cardSortMatch.user_id = { $in: filteredUserIds };
  const cardsortCount = await CardSort.countDocuments(cardSortMatch);
  const [studyCards, cardSortColumnsTotal, latestCardSortBySession] = await Promise.all([
    Card.find(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {}, { _id: 1, label: 1 }).lean(),
    CardSortColumn.countDocuments(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds }, is_active: true } : { is_active: true }),
    CardSort.aggregate([
      { $match: cardSortMatch },
      { $sort: { created_at: -1, _id: -1 } },
      {
        $group: {
          _id: '$session_id',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
    ]),
  ]);
  const cardLabelById = new Map(studyCards.map((c) => [String(c._id), c.label || String(c._id)]));
  const columnDist = {};
  const cardDist = {};
  const columnCardDist = {};
  const cardColumnDist = {};
  const userIdeaColumnDist = {};
  const userIdeaColumnNameDist = {};
  const userIdeaCardLabelDist = {};
  let customColumnsTotal = 0;
  let customCardsTotal = 0;

  for (const cs of latestCardSortBySession) {
    for (const group of cs.card_groups || []) {
      const groupName = String(group.group_name || '').trim();
      if (!groupName) continue;
      const ids = (group.card_ids || []).map((id) => String(id));
      columnDist[groupName] = (columnDist[groupName] || 0) + ids.length;
      if (!columnCardDist[groupName]) columnCardDist[groupName] = {};
      for (const id of ids) {
        cardDist[id] = (cardDist[id] || 0) + 1;
        const label = cardLabelById.get(id) || id;
        columnCardDist[groupName][label] = (columnCardDist[groupName][label] || 0) + 1;
        if (!cardColumnDist[label]) cardColumnDist[label] = {};
        cardColumnDist[label][groupName] = (cardColumnDist[label][groupName] || 0) + 1;
      }
    }
    const customColumns = cs.user_idea_category?.custom_columns || [];
    const customCards = cs.user_idea_category?.custom_cards || [];
    customColumnsTotal += customColumns.length;
    customCardsTotal += customCards.length;
    for (const customColumn of customColumns) {
      const columnName = String(customColumn || '').trim();
      if (!columnName) continue;
      userIdeaColumnNameDist[columnName] = (userIdeaColumnNameDist[columnName] || 0) + 1;
    }
    for (const customCard of customCards) {
      const col = String(customCard?.column || '').trim() || 'ohne_spalte';
      const label = String(customCard?.label || '').trim();
      userIdeaColumnDist[col] = (userIdeaColumnDist[col] || 0) + 1;
      if (label) userIdeaCardLabelDist[label] = (userIdeaCardLabelDist[label] || 0) + 1;
    }
  }

  const cardDistribution = Object.entries(cardDist)
    .map(([card_id, count]) => ({
      card_id,
      card_label: cardLabelById.get(card_id) || card_id,
      count,
    }))
    .sort((a, b) => b.count - a.count || String(a.card_label).localeCompare(String(b.card_label), 'de-DE'));

  const columnCardDistribution = Object.entries(columnCardDist)
    .map(([column, cardMap]) => ({
      column,
      total: Object.values(cardMap).reduce((sum, value) => sum + value, 0),
      cards: Object.entries(cardMap)
        .map(([card_label, count]) => ({ card_label, count }))
        .sort((a, b) => b.count - a.count || String(a.card_label).localeCompare(String(b.card_label), 'de-DE')),
    }))
    .sort((a, b) => b.total - a.total || String(a.column).localeCompare(String(b.column), 'de-DE'));
  const cardColumnDistribution = Object.entries(cardColumnDist)
    .map(([card_label, columnMap]) => ({
      card_label,
      total: Object.values(columnMap).reduce((sum, value) => sum + value, 0),
      columns: Object.entries(columnMap)
        .map(([column, count]) => ({ column, count }))
        .sort((a, b) => b.count - a.count || String(a.column).localeCompare(String(b.column), 'de-DE')),
    }))
    .sort((a, b) => b.total - a.total || String(a.card_label).localeCompare(String(b.card_label), 'de-DE'));

  const cardSort = {
    submissions_total: cardsortCount,
    latest_session_submissions: latestCardSortBySession.length,
    configured_cards_total: studyCards.length,
    configured_columns_total: cardSortColumnsTotal,
    column_distribution: toSortedRows(columnDist, 'column'),
    column_card_distribution: columnCardDistribution,
    card_column_distribution: cardColumnDistribution,
    card_distribution: cardDistribution,
    user_idea: {
      custom_columns_total: customColumnsTotal,
      custom_cards_total: customCardsTotal,
      custom_columns_by_name: toSortedRows(userIdeaColumnNameDist, 'column'),
      custom_cards_by_column: toSortedRows(userIdeaColumnDist, 'column'),
      custom_cards_by_label: toSortedRows(userIdeaCardLabelDist, 'label'),
    },
  };

  const taskMatch = studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {};
  if (mixedFlowStudyId) taskMatch.session_id = { $in: scopedSessionIds };
  if (filteredUserIds) taskMatch.user_id = { $in: filteredUserIds };
  const [imageAssetsTotal, imageAssets, taskDefs, taskResponses, imageTaskResponses, studyForImageTasks] = await Promise.all([
    ImageAsset.countDocuments(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {}),
    ImageAsset.find(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {}, { _id: 1, path: 1, alt_text: 1 }).lean(),
    ResearchTask.find(studyScopeIds.length > 0 ? { study_id: { $in: studyScopeIds } } : {}, { _id: 1, title: 1, description: 1, steps: 1 })
      .sort({ order_index: 1, _id: 1 })
      .lean(),
    TaskResponse.find(taskMatch, { task_id: 1, step_index: 1, is_correct: 1, timed_out: 1 }).lean(),
    ImageTaskResponse.find(taskMatch, { task_id: 1, task_type: 1, payload: 1, timed_out: 1 }).lean(),
    studyScopeIds.length > 0 ? Study.find({ _id: { $in: studyScopeIds } }, { image_rating_tasks: 1 }).lean() : [],
  ]);
  const responsesByTaskStep = new Map();
  for (const row of taskResponses) {
    const key = `${String(row.task_id)}:${Number(row.step_index || 0)}`;
    if (!responsesByTaskStep.has(key)) responsesByTaskStep.set(key, []);
    responsesByTaskStep.get(key).push(row);
  }
  const taskItems = taskDefs.map((task) => {
    const steps = Array.isArray(task.steps) && task.steps.length > 0
      ? [...task.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
      : [{ prompt: task.description || '', order_index: 0 }];
    const stepStats = steps.map((step, idx) => {
      const key = `${String(task._id)}:${idx}`;
      const rows = responsesByTaskStep.get(key) || [];
      const total = rows.length;
      const correct = rows.filter((x) => !!x.is_correct).length;
      const timed_out = rows.filter((x) => !!x.timed_out).length;
      const incorrect_click = rows.filter((x) => !x.is_correct && !x.timed_out).length;
      const incorrect = incorrect_click + timed_out;
      return {
        step_index: idx,
        prompt: String(step?.prompt || '').trim() || `Schritt ${idx + 1}`,
        total,
        correct,
        incorrect_click,
        timed_out,
        incorrect,
        correct_rate: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0,
      };
    });
    return {
      task_id: String(task._id),
      title: task.title || String(task._id),
      steps: stepStats,
      total: stepStats.reduce((sum, s) => sum + (s.total || 0), 0),
      correct: stepStats.reduce((sum, s) => sum + (s.correct || 0), 0),
      incorrect_click: stepStats.reduce((sum, s) => sum + (s.incorrect_click || 0), 0),
      timed_out: stepStats.reduce((sum, s) => sum + (s.timed_out || 0), 0),
      incorrect: stepStats.reduce((sum, s) => sum + (s.incorrect || 0), 0),
    };
  });
  const taskWork = {
    submissions_total: taskResponses.length,
    tasks: taskItems,
  };

  const imageTaskDefs = (studyForImageTasks || [])
    .flatMap((row) => (Array.isArray(row?.image_rating_tasks) ? row.image_rating_tasks : []))
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
  const imageAssetById = new Map((imageAssets || []).map((img) => [String(img._id), img]));
  const imageTaskResponsesByTask = new Map();
  for (const row of imageTaskResponses || []) {
    const key = String(row.task_id || '');
    if (!key) continue;
    if (!imageTaskResponsesByTask.has(key)) imageTaskResponsesByTask.set(key, []);
    imageTaskResponsesByTask.get(key).push(row);
  }
  const imageTaskWorkTasks = imageTaskDefs.map((taskDef) => {
    const taskId = String(taskDef.task_id || '');
    const rows = imageTaskResponsesByTask.get(taskId) || [];
    const total = rows.length;
    const taskType = String(taskDef.type || '');
    const timedOut = rows.filter((x) => !!x.timed_out).length;

    if (taskType === 'image_compare') {
      const optionCount = {};
      for (const row of rows) {
        const selected = String(row.payload?.selected_image_id || '').trim();
        if (!selected) continue;
        optionCount[selected] = (optionCount[selected] || 0) + 1;
      }
      return {
        task_id: taskId,
        type: taskType,
        title: taskDef.title || taskId,
        total,
        timed_out: timedOut,
        option_distribution: toSortedRows(optionCount, 'option'),
      };
    }

    if (taskType === 'image_impression') {
      const cardCount = {};
      for (const row of rows) {
        const selected = Array.isArray(row.payload?.selected_cards) ? row.payload.selected_cards : [];
        for (const card of selected) {
          const label = String(card || '').trim();
          if (!label) continue;
          cardCount[label] = (cardCount[label] || 0) + 1;
        }
      }
      return {
        task_id: taskId,
        type: taskType,
        title: taskDef.title || taskId,
        total,
        timed_out: timedOut,
        card_distribution: toSortedRows(cardCount, 'card'),
      };
    }

    if (taskType === 'image_questions') {
      const questions = Array.isArray(taskDef.questions) ? taskDef.questions : [];
      const questionStats = questions.map((question, idx) => {
        const answerCount = {};
        let n = 0;
        for (const row of rows) {
          const ans = String((Array.isArray(row.payload?.answers) ? row.payload.answers[idx] : '') || '').trim();
          if (!ans) continue;
          n += 1;
          const norm = ans.toLocaleLowerCase('de-DE');
          answerCount[norm] = (answerCount[norm] || 0) + 1;
        }
        return {
          question,
          n,
          top_answers: toSortedRows(answerCount, 'answer').slice(0, 10),
        };
      });
      return {
        task_id: taskId,
        type: taskType,
        title: taskDef.title || taskId,
        total,
        timed_out: timedOut,
        questions: questionStats,
      };
    }

    if (taskType === 'image_dislike_mark') {
      const markBuckets = { 'Alles gefällt': 0, '0': 0, '1': 0, '2': 0, '3+': 0 };
      let markSum = 0;
      let likedAll = 0;
      const markPoints = [];
      for (const row of rows) {
        const rowLikedAll = !!row.payload?.liked_all;
        const marks = Array.isArray(row.payload?.marks) ? row.payload.marks.length : 0;
        if (rowLikedAll) {
          likedAll += 1;
          markBuckets['Alles gefällt'] += 1;
        } else if (marks <= 0) markBuckets['0'] += 1;
        else if (marks === 1) markBuckets['1'] += 1;
        else if (marks === 2) markBuckets['2'] += 1;
        else markBuckets['3+'] += 1;
        if (!rowLikedAll) markSum += marks;
        const points = Array.isArray(row.payload?.marks) ? row.payload.marks : [];
        for (const point of points) {
          const x = Number(point?.x);
          const y = Number(point?.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          markPoints.push({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          });
        }
      }
      const imageId = String(taskDef.image_ids?.[0] || '');
      const imageRef = imageAssetById.get(imageId) || null;
      return {
        task_id: taskId,
        type: taskType,
        title: taskDef.title || taskId,
        total,
        timed_out: timedOut,
        liked_all: likedAll,
        avg_marks: total > 0 ? Number((markSum / total).toFixed(2)) : 0,
        marks_distribution: toSortedRows(markBuckets, 'bucket'),
        mark_points: markPoints,
        image_ref: imageRef
          ? {
              _id: String(imageRef._id),
              path: String(imageRef.path || ''),
              alt_text: String(imageRef.alt_text || ''),
            }
          : null,
      };
    }

    return {
      task_id: taskId,
      type: taskType || 'unknown',
      title: taskDef.title || taskId,
      total,
      timed_out: timedOut,
    };
  });
  const imageTaskWork = {
    submissions_total: imageTaskResponses.length,
    tasks: imageTaskWorkTasks,
  };

  return {
    sessions_total: sessionsTotal,
    sessions_done: sessionsDone,
    completion_rate: sessionsTotal ? Number(((sessionsDone / sessionsTotal) * 100).toFixed(2)) : 0,
    questionnaire,
    questionnaire_questions_total: questionDocs.length,
    image_rating: imageAvg,
    image_assets_total: imageAssetsTotal,
    card_sort_submissions: cardsortCount,
    card_sort: cardSort,
    task_work: taskWork,
    image_task_work: imageTaskWork,
  };
}

export function flattenExport(overview, filters = {}) {
  const rows = [];

  for (const q of overview.questionnaire) {
    if (Array.isArray(q.answer_distribution) && q.answer_distribution.length > 0) {
      for (const answerRow of q.answer_distribution) {
        rows.push({
          studyId: filters.studyId || '',
          studyVersion: '',
          moduleType: 'questionnaire',
          questionId: String(q._id),
          questionText: q.question_text || '',
          metricType: 'answer_count',
          value: answerRow.value,
          count: answerRow.count,
          group: filters.testGroup || '',
          n: q.n,
          dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
        });
      }
    } else {
      rows.push({
        studyId: filters.studyId || '',
        studyVersion: '',
        moduleType: 'questionnaire',
        questionId: String(q._id),
        questionText: q.question_text || '',
        metricType: 'answer_count',
        value: '',
        count: 0,
        group: filters.testGroup || '',
        n: 0,
        dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
      });
    }
  }

  for (const img of overview.image_rating) {
    rows.push({
      studyId: filters.studyId || '',
      studyVersion: '',
      moduleType: 'image_rating',
      questionId: String(img._id),
      metricType: 'avg',
      value: Number(img.avg || 0).toFixed(2),
      group: filters.testGroup || '',
      n: img.n,
      dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
    });
  }

  for (const task of overview.image_task_work?.tasks || []) {
    rows.push({
      studyId: filters.studyId || '',
      studyVersion: '',
      moduleType: 'image_task_work',
      questionId: String(task.task_id),
      questionText: task.title || String(task.task_id),
      metricType: task.type || 'image_task',
      value: '',
      count: task.total || 0,
      timedOut: task.timed_out || 0,
      group: filters.testGroup || '',
      n: task.total || 0,
      dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
    });
  }

  for (const task of overview.task_work?.tasks || []) {
    for (const step of task.steps || []) {
      rows.push({
        studyId: filters.studyId || '',
        studyVersion: '',
        moduleType: 'task_work',
        questionId: `${task.task_id}:${step.step_index}`,
        questionText: `${task.title} - Schritt ${step.step_index + 1}`,
        metricType: 'step_submissions',
        value: step.prompt || '',
        count: step.total || 0,
        correct: step.correct || 0,
        incorrectClick: step.incorrect_click || 0,
        timedOut: step.timed_out || 0,
        incorrect: step.incorrect || 0,
        correctRate: step.correct_rate || 0,
        group: filters.testGroup || '',
        n: step.total || 0,
        dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
      });
    }
  }

  return rows;
}
