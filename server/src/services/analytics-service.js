import { Answer } from '../models/Answer.js';
import { ImageRating } from '../models/ImageRating.js';
import { CardSort } from '../models/CardSort.js';
import { Session } from '../models/Session.js';

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

export async function analyticsOverview(filters = {}) {
  const sessionMatch = buildSessionMatch(filters);
  const [sessionsTotal, sessionsDone] = await Promise.all([
    Session.countDocuments(sessionMatch),
    Session.countDocuments({ ...sessionMatch, status: 'done' }),
  ]);

  const answersLikert = await Answer.aggregate([
    { $match: { study_id: filters.studyId ? filters.studyId : { $exists: true } } },
    {
      $group: {
        _id: '$question_id',
        avg: { $avg: '$response' },
        n: { $sum: 1 },
      },
    },
  ]);

  const imageAvg = await ImageRating.aggregate([
    { $match: { study_id: filters.studyId ? filters.studyId : { $exists: true } } },
    {
      $group: {
        _id: '$image_id',
        avg: { $avg: '$rating' },
        n: { $sum: 1 },
      },
    },
  ]);

  const cardsortCount = await CardSort.countDocuments(
    filters.studyId ? { study_id: filters.studyId } : {}
  );

  return {
    sessions_total: sessionsTotal,
    sessions_done: sessionsDone,
    completion_rate: sessionsTotal ? Number(((sessionsDone / sessionsTotal) * 100).toFixed(2)) : 0,
    questionnaire: answersLikert,
    image_rating: imageAvg,
    card_sort_submissions: cardsortCount,
  };
}

export function flattenExport(overview, filters = {}) {
  const rows = [];

  for (const q of overview.questionnaire) {
    rows.push({
      studyId: filters.studyId || '',
      studyVersion: '',
      moduleType: 'questionnaire',
      questionId: String(q._id),
      metricType: 'avg',
      value: Number(q.avg || 0).toFixed(2),
      group: filters.testGroup || '',
      n: q.n,
      dateRange: `${filters.dateFrom || ''}..${filters.dateTo || ''}`,
    });
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
