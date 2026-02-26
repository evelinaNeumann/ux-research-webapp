import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { analyticsOverview, flattenExport } from '../services/analytics-service.js';
import { toCsv } from '../utils/csv.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function collectFilters(query = {}) {
  return {
    studyId: query.studyId,
    userId: query.userId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    testGroup: query.testGroup,
    ageGroup: query.ageGroup,
    interests: query.interests,
    needs: query.needs,
  };
}

router.get('/overview', async (req, res, next) => {
  try {
    const filters = collectFilters(req.query);
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/group/:groupId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, testGroup: req.params.groupId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, studyId: req.params.studyId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/charts', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, studyId: req.params.studyId });
    const data = await analyticsOverview(filters);
    res.json({ chart_type: 'bar', labels: ['sessions_total', 'sessions_done'], series: [data.sessions_total, data.sessions_done], filters_applied: filters });
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, userId: req.params.userId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId/charts', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, userId: req.params.userId });
    const data = await analyticsOverview(filters);
    res.json({ chart_type: 'line', labels: ['sessions_total', 'sessions_done'], series: [data.sessions_total, data.sessions_done], filters_applied: filters });
  } catch (err) {
    next(err);
  }
});

router.get('/compare/users', async (req, res) => {
  const userIds = String(req.query.userIds || '').split(',').filter(Boolean);
  res.json({ userIds, message: 'Comparison endpoint scaffold ready' });
});

router.get('/compare/studies', async (req, res) => {
  const studyIds = String(req.query.studyIds || '').split(',').filter(Boolean);
  res.json({ studyIds, message: 'Comparison endpoint scaffold ready' });
});

router.get('/export', async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const filters = collectFilters(req.query);
    const data = await analyticsOverview(filters);
    const rows = flattenExport(data, filters);

    if (format === 'csv') {
      const csv = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      return res.status(200).send(csv);
    }

    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/export/chart', async (req, res) => {
  res.status(501).json({ message: 'PNG chart export endpoint scaffolded; renderer integration pending' });
});

export default router;
