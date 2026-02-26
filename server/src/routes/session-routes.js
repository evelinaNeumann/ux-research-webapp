import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { Study } from '../models/Study.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { getPagination } from '../middleware/pagination.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { study_id } = req.body;
    if (!study_id) throw badRequest('study_id required');

    const study = await Study.findById(study_id);
    if (!study) throw notFound('study not found');
    if (req.auth.role !== 'admin') {
      const assignment = await StudyAssignment.findOne({
        study_id,
        user_id: req.auth.sub,
        is_active: true,
      });
      if (!assignment) throw forbidden('study not assigned to user');

      const profile = await UserStudyProfile.findOne({
        study_id,
        user_id: req.auth.sub,
      });
      if (!profile) throw badRequest('profile setup required');
    }

    const existing = await Session.findOne({ user_id: req.auth.sub, study_id, status: 'in_progress' }).sort({ createdAt: -1 });
    if (existing) return res.status(200).json(existing);

    if (req.auth.role !== 'admin') {
      const doneSession = await Session.findOne({ user_id: req.auth.sub, study_id, status: 'done' }).sort({ completed_at: -1 });
      if (doneSession) throw forbidden('study already completed');
    }

    const item = await Session.create({
      user_id: req.auth.sub,
      study_id,
      study_version: study.version,
      module_type: study.type,
      current_module: (study.module_order?.[0] || 'questionnaire'),
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = req.auth.role === 'admin' ? {} : { user_id: req.auth.sub };
    const [items, total] = await Promise.all([
      Session.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Session.countDocuments(query),
    ]);
    res.json({ page, limit, total, items });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await Session.findById(req.params.id);
    if (!item) throw notFound('session not found');
    if (req.auth.role !== 'admin' && String(item.user_id) !== req.auth.sub) throw forbidden();
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/complete', async (req, res, next) => {
  try {
    const item = await Session.findById(req.params.id);
    if (!item) throw notFound('session not found');
    if (req.auth.role !== 'admin' && String(item.user_id) !== req.auth.sub) throw forbidden();

    item.status = 'done';
    item.completed_at = new Date();
    item.duration_seconds = Math.floor((item.completed_at.getTime() - item.started_at.getTime()) / 1000);
    await item.save();

    res.json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
