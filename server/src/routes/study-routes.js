import { Router } from 'express';
import { Study } from '../models/Study.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPagination } from '../middleware/pagination.js';
import { notFound, badRequest } from '../utils/errors.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = req.auth.role === 'admin' ? {} : { is_active: true };
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
    const study = await Study.findById(req.params.id);
    if (!study) throw notFound('study not found');
    if (!study.is_active && req.auth.role !== 'admin') throw notFound('study not found');
    res.json(study);
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
