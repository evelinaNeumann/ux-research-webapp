import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { Question } from '../models/Question.js';
import { Card } from '../models/Card.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { PageTreeNode } from '../models/PageTreeNode.js';
import { ResearchTask } from '../models/ResearchTask.js';
import { Study } from '../models/Study.js';
import { User } from '../models/User.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { badRequest, notFound } from '../utils/errors.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', async (_req, res) => {
  const users = await User.find({}, { username: 1, role: 1, created_at: 1 }).sort({ created_at: -1 });
  res.json(users);
});

router.put('/users/:userId/role', async (req, res, next) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return next(badRequest('role must be user or admin'));
  const user = await User.findById(req.params.userId);
  if (!user) return next(notFound('user not found'));

  if (String(user._id) === req.auth.sub && role !== 'admin') {
    return next(badRequest('you cannot remove your own admin role'));
  }
  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) return next(badRequest('cannot demote last admin'));
  }

  user.role = role;
  await user.save();
  res.json({ id: user._id, username: user.username, role: user.role });
});

router.delete('/users/:userId', async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(notFound('user not found'));

  if (String(user._id) === req.auth.sub) {
    return next(badRequest('you cannot delete your own admin account'));
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) return next(badRequest('cannot delete last admin'));
  }

  await User.findByIdAndDelete(req.params.userId);
  res.status(204).send();
});

router.get('/studies/:studyId/assignments', async (req, res) => {
  const items = await StudyAssignment.find({ study_id: req.params.studyId, is_active: true })
    .populate('user_id', 'username role')
    .sort({ assigned_at: -1 });
  res.json(items);
});

router.post('/studies/:studyId/assignments', async (req, res, next) => {
  const { user_id } = req.body;
  if (!user_id) return next(badRequest('user_id required'));

  const user = await User.findById(user_id);
  if (!user) return next(notFound('user not found'));
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));

  const item = await StudyAssignment.findOneAndUpdate(
    { study_id: req.params.studyId, user_id },
    { study_id: req.params.studyId, user_id, assigned_by: req.auth.sub, assigned_at: new Date(), is_active: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(item);
});

router.delete('/studies/:studyId/assignments/:userId', async (req, res) => {
  await StudyAssignment.findOneAndUpdate(
    { study_id: req.params.studyId, user_id: req.params.userId },
    { is_active: false }
  );
  res.status(204).send();
});

router.get('/studies/:studyId/questions', async (req, res) => {
  const items = await Question.find({ study_id: req.params.studyId });
  res.json(items);
});
router.post('/studies/:studyId/questions', async (req, res) => {
  const item = await Question.create({ ...req.body, study_id: req.params.studyId });
  res.status(201).json(item);
});
router.put('/questions/:questionId', async (req, res, next) => {
  const item = await Question.findByIdAndUpdate(req.params.questionId, req.body, { new: true });
  if (!item) return next(notFound('question not found'));
  res.json(item);
});
router.delete('/questions/:questionId', async (req, res, next) => {
  const item = await Question.findByIdAndDelete(req.params.questionId);
  if (!item) return next(notFound('question not found'));
  res.status(204).send();
});

router.get('/studies/:studyId/cards', async (req, res) => {
  const items = await Card.find({ study_id: req.params.studyId });
  res.json(items);
});
router.post('/studies/:studyId/cards', async (req, res) => {
  const item = await Card.create({ ...req.body, study_id: req.params.studyId });
  res.status(201).json(item);
});
router.put('/cards/:cardId', async (req, res, next) => {
  const item = await Card.findByIdAndUpdate(req.params.cardId, req.body, { new: true });
  if (!item) return next(notFound('card not found'));
  res.json(item);
});
router.delete('/cards/:cardId', async (req, res, next) => {
  const item = await Card.findByIdAndDelete(req.params.cardId);
  if (!item) return next(notFound('card not found'));
  res.status(204).send();
});

router.get('/studies/:studyId/images', async (req, res) => {
  const items = await ImageAsset.find({ study_id: req.params.studyId });
  res.json(items);
});
router.post('/studies/:studyId/images/upload', uploadImage.single('image'), async (req, res) => {
  const item = await ImageAsset.create({
    study_id: req.params.studyId,
    path: req.file.path,
    alt_text: req.body.alt_text || '',
    category: req.body.category || '',
  });
  res.status(201).json(item);
});
router.put('/images/:imageId', async (req, res, next) => {
  const item = await ImageAsset.findByIdAndUpdate(req.params.imageId, req.body, { new: true });
  if (!item) return next(notFound('image not found'));
  res.json(item);
});
router.delete('/images/:imageId', async (req, res, next) => {
  const item = await ImageAsset.findByIdAndDelete(req.params.imageId);
  if (!item) return next(notFound('image not found'));
  res.status(204).send();
});

router.get('/studies/:studyId/page-tree', async (req, res) => {
  const items = await PageTreeNode.find({ study_id: req.params.studyId }).sort({ order_index: 1 });
  res.json(items);
});
router.post('/studies/:studyId/page-tree/nodes', async (req, res) => {
  const item = await PageTreeNode.create({ ...req.body, study_id: req.params.studyId });
  res.status(201).json(item);
});
router.put('/page-tree/nodes/:nodeId', async (req, res, next) => {
  const item = await PageTreeNode.findByIdAndUpdate(req.params.nodeId, req.body, { new: true });
  if (!item) return next(notFound('node not found'));
  res.json(item);
});
router.delete('/page-tree/nodes/:nodeId', async (req, res, next) => {
  const item = await PageTreeNode.findByIdAndDelete(req.params.nodeId);
  if (!item) return next(notFound('node not found'));
  res.status(204).send();
});
router.put('/studies/:studyId/page-tree/reorder', async (req, res) => {
  const { nodes } = req.body;
  await Promise.all(nodes.map((n) => PageTreeNode.findByIdAndUpdate(n.id, { order_index: n.order_index })));
  res.status(204).send();
});

router.get('/studies/:studyId/tasks', async (req, res) => {
  const items = await ResearchTask.find({ study_id: req.params.studyId }).sort({ order_index: 1 });
  res.json(items);
});
router.post('/studies/:studyId/tasks', async (req, res) => {
  const item = await ResearchTask.create({ ...req.body, study_id: req.params.studyId });
  res.status(201).json(item);
});
router.put('/tasks/:taskId', async (req, res, next) => {
  const item = await ResearchTask.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
  if (!item) return next(notFound('task not found'));
  res.json(item);
});
router.delete('/tasks/:taskId', async (req, res, next) => {
  const item = await ResearchTask.findByIdAndDelete(req.params.taskId);
  if (!item) return next(notFound('task not found'));
  res.status(204).send();
});

router.post('/studies/:studyId/content/publish', async (req, res, next) => {
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));
  study.version += 1;
  await study.save();
  res.json({ studyId: study._id, version: study.version });
});

router.post('/studies/:studyId/content/rollback', async (req, res, next) => {
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));
  study.version = Math.max(1, study.version - 1);
  await study.save();
  res.json({ studyId: study._id, version: study.version });
});

export default router;
