import { Answer } from '../models/Answer.js';
import { ImageRating } from '../models/ImageRating.js';
import { CardSort } from '../models/CardSort.js';
import { Session } from '../models/Session.js';
import { Question } from '../models/Question.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { Card } from '../models/Card.js';
import mongoose from 'mongoose';

function buildSessionMatch(filters = {}) {
  const match = {};
  if (filters.studyId) match.study_id = filters.studyId;
  if (filters.userId) match.user_id = filters.userId;
  if (filters.dateFrom || filters.dateTo) {
    match.createdAt = {};
    if (filters.dateFrom) match.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) match.createdAt.$lte = new Date(filters.dateTo);
  }
  return match;
}

function buildStudyMatch(studyId) {
  if (!studyId) return { $exists: true };
  if (mongoose.Types.ObjectId.isValid(studyId)) {
    return new mongoose.Types.ObjectId(studyId);
  }
  return studyId;
}

function toSortedRows(obj, keyName = 'key') {
  return Object.entries(obj)
    .map(([key, count]) => ({ [keyName]: key, count }))
    .sort((a, b) => b.count - a.count || String(a[keyName]).localeCompare(String(b[keyName]), 'de-DE'));
}

function hasProfileFilters(filters = {}) {
  return Boolean(filters.age || filters.role || filters.keyword);
}

async function resolveFilteredUserIds(filters = {}) {
  if (!hasProfileFilters(filters)) return null;

  const match = {};
  if (filters.studyId) match.study_id = buildStudyMatch(filters.studyId);
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
  const studyMatch = buildStudyMatch(filters.studyId);
  const filteredUserIds = await resolveFilteredUserIds(filters);
  if (filteredUserIds) {
    sessionMatch.user_id = { $in: filteredUserIds };
  }
  if (filteredUserIds && filteredUserIds.length === 0) {
    return {
      sessions_total: 0,
      sessions_done: 0,
      completion_rate: 0,
      questionnaire: [],
      image_rating: [],
      card_sort_submissions: 0,
    };
  }
  const [sessionsTotal, sessionsDone] = await Promise.all([
    Session.countDocuments(sessionMatch),
    Session.countDocuments({ ...sessionMatch, status: 'done' }),
  ]);

  const answerMatch = filters.studyId ? { study_id: studyMatch } : {};
  if (filteredUserIds) answerMatch.user_id = { $in: filteredUserIds };
  const [questionDocs, answerDocs] = await Promise.all([
    Question.find(filters.studyId ? { study_id: studyMatch } : {}, { _id: 1, text: 1 }).sort({ _id: 1 }).lean(),
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

  const imageMatch = filters.studyId ? { study_id: studyMatch } : {};
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

  const cardSortMatch = filters.studyId ? { study_id: studyMatch } : {};
  if (filteredUserIds) cardSortMatch.user_id = { $in: filteredUserIds };
  const cardsortCount = await CardSort.countDocuments(cardSortMatch);
  const [studyCards, latestCardSortBySession] = await Promise.all([
    Card.find(filters.studyId ? { study_id: studyMatch } : {}, { _id: 1, label: 1 }).lean(),
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

  return {
    sessions_total: sessionsTotal,
    sessions_done: sessionsDone,
    completion_rate: sessionsTotal ? Number(((sessionsDone / sessionsTotal) * 100).toFixed(2)) : 0,
    questionnaire,
    image_rating: imageAvg,
    card_sort_submissions: cardsortCount,
    card_sort: cardSort,
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

  return rows;
}
