import { Router } from 'express';
import { Study } from '../models/Study.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { Question } from '../models/Question.js';
import { Card } from '../models/Card.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { StudyProfileCard } from '../models/StudyProfileCard.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPagination } from '../middleware/pagination.js';
import { notFound, badRequest } from '../utils/errors.js';

const router = Router();

async function assertStudyAccess(studyId, auth) {
  const study = await Study.findById(studyId);
  if (!study) throw notFound('study not found');
  if (auth.role !== 'admin') {
    if (!study.is_active) throw notFound('study not found');
    const assignment = await StudyAssignment.findOne({
      study_id: study._id,
      user_id: auth.sub,
      is_active: true,
    });
    if (!assignment) throw notFound('study not found');
  }
  return study;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let query = {};
    if (req.auth.role !== 'admin') {
      const assignments = await StudyAssignment.find({ user_id: req.auth.sub, is_active: true }, { study_id: 1 });
      const studyIds = assignments.map((x) => x.study_id);
      query = { _id: { $in: studyIds }, is_active: true };
    }
    const [items, total] = await Promise.all([
      Study.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Study.countDocuments(query),
    ]);
    res.json({ page, limit, total, items });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const study = await assertStudyAccess(req.params.id, req.auth);
    res.json(study);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/questions', requireAuth, async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await Question.find({ study_id: req.params.id }).sort({ _id: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/cards', requireAuth, async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await Card.find({ study_id: req.params.id }).sort({ _id: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/images', requireAuth, async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await ImageAsset.find({ study_id: req.params.id }).sort({ uploaded_at: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/profile-cards', requireAuth, async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await StudyProfileCard.find({ study_id: req.params.id, is_active: true }).sort({ order_index: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, type, module_order } = req.body;
    if (!name) throw badRequest('name required');
    const study = await Study.create({ name, type, module_order });
    res.status(201).json(study);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, type, is_active, module_order } = req.body;
    const study = await Study.findById(req.params.id);
    if (!study) throw notFound('study not found');

    if (name !== undefined) study.name = name;
    if (type !== undefined) study.type = type;
    if (is_active !== undefined) study.is_active = is_active;
    if (module_order !== undefined) study.module_order = module_order;
    study.version += 1;

    await study.save();
    res.json(study);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await Study.findByIdAndDelete(req.params.id);
    if (!deleted) throw notFound('study not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
