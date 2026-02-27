import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { StudyProfileCard } from '../models/StudyProfileCard.js';
import { CardSortColumn } from '../models/CardSortColumn.js';
import {
  UserStudyProfile,
  USER_PROFILE_AGE_RANGES,
  USER_PROFILE_ROLE_CATEGORIES,
} from '../models/UserStudyProfile.js';
import { uploadTaskFile } from '../middleware/upload-task-file.js';
import { badRequest, notFound } from '../utils/errors.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TASK_FILES_DIR = path.resolve(__dirname, '../../uploads/task-files');

function normalizeAnswerId(value) {
  let id = String(value || '').trim();
  if (!id) return '';
  const dataIdMatch = id.match(/data-answer-id\s*=\s*["']([^"']+)["']/i);
  if (dataIdMatch?.[1]) id = dataIdMatch[1];
  const hrefMatch = id.match(/href\s*=\s*["']([^"']+)["']/i);
  if (hrefMatch?.[1]) id = hrefMatch[1];
  if (!hrefMatch?.[1] && /^https?:\/\//i.test(id)) {
    try {
      const url = new URL(id);
      id = `${url.pathname || ''}${url.search || ''}${url.hash || ''}` || id;
    } catch {
      // keep original on parse failure
    }
  }
  try {
    id = decodeURIComponent(id);
  } catch {
    // keep original if malformed encoding
  }
  if (id.startsWith('/')) {
    id = id.replace(/\/{2,}/g, '/');
    if (id.length > 1 && id.endsWith('/')) id = id.slice(0, -1);
  }
  return id.toLocaleLowerCase('de-DE');
}

async function extractAnswerIdsFromHtmlPublicPath(publicPath = '') {
  if (!String(publicPath).startsWith('/uploads/task-files/')) return [];
  const filename = path.basename(String(publicPath));
  const absolutePath = path.join(TASK_FILES_DIR, filename);
  let html = '';
  try {
    html = await fs.readFile(absolutePath, 'utf8');
  } catch {
    return [];
  }
  const ids = [];
  const dataIdPattern = /data-answer-id\s*=\s*["']([^"']+)["']/gi;
  let match = dataIdPattern.exec(html);
  while (match) {
    const id = String(match[1] || '').trim();
    if (id) ids.push(id);
    match = dataIdPattern.exec(html);
  }
  const hrefPattern = /<a[^>]*\shref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  match = hrefPattern.exec(html);
  while (match) {
    const href = String(match[1] || '').trim();
    if (href && href.startsWith('/')) ids.push(href);
    match = hrefPattern.exec(html);
  }
  return Array.from(new Set(ids));
}

async function normalizeInteractiveTaskConfig(configValue = {}, attachments = []) {
  const rawInteractive = configValue?.interactive || {};
  const htmlAttachments = (attachments || []).filter((item) => item?.format === 'html' && item?.path);
  let filePath = String(rawInteractive.file_path || '').trim();
  if (!htmlAttachments.some((file) => file.path === filePath)) {
    filePath = htmlAttachments.length === 1 ? htmlAttachments[0].path : '';
  }

  let selectableIds = filePath ? await extractAnswerIdsFromHtmlPublicPath(filePath) : [];
  if (!selectableIds.length) {
    selectableIds = Array.isArray(rawInteractive.selectable_ids)
    ? rawInteractive.selectable_ids.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
  }
  const selectableNormalized = Array.from(new Set(selectableIds.map((x) => normalizeAnswerId(x)).filter(Boolean)));
  const selectableSet = new Set(selectableNormalized);
  const correctIds = Array.isArray(rawInteractive.correct_ids)
    ? rawInteractive.correct_ids
        .map((x) => normalizeAnswerId(x))
        .filter((x) => x && selectableSet.has(x))
    : [];
  const uniqueSelectable = selectableNormalized;
  const uniqueCorrect = Array.from(new Set(correctIds));
  const enabled = !!filePath && uniqueSelectable.length > 0;

  return {
    ...configValue,
    interactive: {
      enabled,
      file_path: filePath,
      selectable_ids: uniqueSelectable,
      correct_ids: uniqueCorrect,
    },
  };
}

function normalizeTaskSteps(stepsValue = [], fallbackDescription = '') {
  const rawSteps = Array.isArray(stepsValue) ? stepsValue : [];
  const normalized = rawSteps
    .map((step, idx) => ({
      prompt: String(step?.prompt || '').trim(),
      order_index:
        Number.isFinite(Number(step?.order_index)) && Number(step?.order_index) >= 0
          ? Number(step.order_index)
          : idx,
      correct_ids: Array.isArray(step?.correct_ids)
        ? step.correct_ids.map((x) => String(x || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((step) => step.prompt);
  if (!normalized.length && String(fallbackDescription || '').trim()) {
    normalized.push({
      prompt: String(fallbackDescription).trim(),
      order_index: 0,
      correct_ids: [],
    });
  }
  return normalized.sort((a, b) => a.order_index - b.order_index);
}

router.get('/users', async (_req, res) => {
  const users = await User.find(
    {},
    {
      username: 1,
      role: 1,
      created_at: 1,
      password_reset_status: 1,
      password_reset_requested_at: 1,
      password_reset_required: 1,
    }
  ).sort({ created_at: -1 });
  res.json(users);
});

router.get('/users/password-reset-requests', async (_req, res) => {
  const items = await User.find(
    { role: 'user', password_reset_status: 'pending' },
    { username: 1, password_reset_requested_at: 1 }
  ).sort({ password_reset_requested_at: 1 });
  res.json(items);
});

router.post('/users/:userId/password-reset-decision', async (req, res, next) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approve', 'deny'].includes(decision)) return next(badRequest('decision must be approve or deny'));
  const user = await User.findById(req.params.userId);
  if (!user) return next(notFound('user not found'));
  if (user.role !== 'user') return next(badRequest('password reset decision only allowed for users'));

  if (decision === 'approve') {
    user.password_reset_required = true;
    user.password_reset_status = 'approved';
  } else {
    user.password_reset_required = false;
    user.password_reset_status = 'none';
    user.password_reset_requested_at = null;
  }
  await user.save();
  res.json({
    user_id: user._id,
    username: user.username,
    password_reset_status: user.password_reset_status,
    password_reset_required: user.password_reset_required,
  });
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

router.get('/users/:userId/profiles', async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(notFound('user not found'));

  const items = await UserStudyProfile.find({ user_id: req.params.userId })
    .populate('study_id', 'name type version')
    .sort({ completed_at: -1 });
  res.json(items);
});

router.put('/users/:userId/profiles/:studyId', async (req, res, next) => {
  const { age_range, role_category, role_custom, key_points } = req.body;

  if (!USER_PROFILE_AGE_RANGES.includes(age_range)) return next(badRequest('invalid age_range'));
  if (!USER_PROFILE_ROLE_CATEGORIES.includes(role_category)) return next(badRequest('invalid role_category'));
  if (role_category === 'other' && !String(role_custom || '').trim()) {
    return next(badRequest('role_custom required for other role'));
  }
  const user = await User.findById(req.params.userId);
  if (!user) return next(notFound('user not found'));
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));

  const cards = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true });
  const allowed = new Set(cards.map((c) => c.label));
  const hasProfileWords = cards.length > 0;
  if (!Array.isArray(key_points)) return next(badRequest('key_points must be an array'));
  if (hasProfileWords && key_points.length !== 4) {
    return next(badRequest('exactly 4 key_points required'));
  }
  if (!hasProfileWords && key_points.length > 0) {
    return next(badRequest('key_points not allowed for studies without profile words'));
  }
  for (const point of key_points) {
    if (!allowed.has(point)) return next(badRequest('key_points contain invalid values'));
  }

  const profile = await UserStudyProfile.findOneAndUpdate(
    { user_id: req.params.userId, study_id: req.params.studyId },
    {
      user_id: req.params.userId,
      study_id: req.params.studyId,
      age_range,
      role_category,
      role_custom: role_category === 'other' ? String(role_custom).trim() : '',
      key_points,
      completed_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(profile);
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

router.post('/studies/:studyId/assignments/assign-all', async (req, res, next) => {
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));

  study.assign_to_all_users = true;
  await study.save();

  const users = await User.find({ role: 'user' }, { _id: 1 });
  if (users.length > 0) {
    await StudyAssignment.bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { study_id: study._id, user_id: user._id },
          update: {
            $set: {
              is_active: true,
              assigned_at: new Date(),
              assigned_by: req.auth.sub,
            },
            $setOnInsert: {
              study_id: study._id,
              user_id: user._id,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  res.json({
    study_id: study._id,
    assign_to_all_users: true,
    users_updated: users.length,
  });
});

router.delete('/studies/:studyId/assignments/assign-all', async (req, res, next) => {
  const study = await Study.findById(req.params.studyId);
  if (!study) return next(notFound('study not found'));
  study.assign_to_all_users = false;
  await study.save();
  res.status(204).send();
});

router.delete('/studies/:studyId/assignments/:userId', async (req, res) => {
  await StudyAssignment.findOneAndUpdate(
    { study_id: req.params.studyId, user_id: req.params.userId },
    {
      study_id: req.params.studyId,
      user_id: req.params.userId,
      assigned_by: req.auth.sub,
      assigned_at: new Date(),
      is_active: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(204).send();
});

router.get('/studies/:studyId/profile-cards', async (req, res) => {
  const items = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true }).sort({ order_index: 1 });
  res.json(items);
});

router.post('/studies/:studyId/profile-cards', async (req, res, next) => {
  const { label } = req.body;
  if (!String(label || '').trim()) return next(badRequest('label required'));

  const count = await StudyProfileCard.countDocuments({ study_id: req.params.studyId, is_active: true });
  if (count >= 8) return next(badRequest('max 8 profile cards allowed per study'));

  const item = await StudyProfileCard.create({
    study_id: req.params.studyId,
    label: String(label).trim(),
    order_index: count,
    is_active: true,
  });
  res.status(201).json(item);
});

router.put('/profile-cards/:cardId', async (req, res, next) => {
  const { label, order_index, is_active } = req.body;
  const item = await StudyProfileCard.findById(req.params.cardId);
  if (!item) return next(notFound('profile card not found'));
  if (label !== undefined) item.label = String(label).trim();
  if (order_index !== undefined) item.order_index = Number(order_index);
  if (is_active !== undefined) item.is_active = !!is_active;
  await item.save();
  res.json(item);
});

router.delete('/profile-cards/:cardId', async (req, res, next) => {
  const item = await StudyProfileCard.findById(req.params.cardId);
  if (!item) return next(notFound('profile card not found'));
  item.is_active = false;
  await item.save();
  res.status(204).send();
});

router.get('/studies/:studyId/card-sort-columns', async (req, res) => {
  const items = await CardSortColumn.find({ study_id: req.params.studyId, is_active: true }).sort({ order_index: 1 });
  res.json(items);
});

router.post('/studies/:studyId/card-sort-columns', async (req, res, next) => {
  const { label } = req.body;
  if (!String(label || '').trim()) return next(badRequest('label required'));
  const count = await CardSortColumn.countDocuments({ study_id: req.params.studyId, is_active: true });
  const item = await CardSortColumn.create({
    study_id: req.params.studyId,
    label: String(label).trim(),
    order_index: count,
    is_active: true,
  });
  res.status(201).json(item);
});

router.put('/card-sort-columns/:columnId', async (req, res, next) => {
  const { label, order_index, is_active } = req.body;
  const item = await CardSortColumn.findById(req.params.columnId);
  if (!item) return next(notFound('card sort column not found'));
  if (label !== undefined) item.label = String(label).trim();
  if (order_index !== undefined) item.order_index = Number(order_index);
  if (is_active !== undefined) item.is_active = !!is_active;
  await item.save();
  res.json(item);
});

router.delete('/card-sort-columns/:columnId', async (req, res, next) => {
  const item = await CardSortColumn.findById(req.params.columnId);
  if (!item) return next(notFound('card sort column not found'));
  item.is_active = false;
  await item.save();
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
router.post('/studies/:studyId/tasks', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return next(badRequest('task title required'));
    const normalizedConfig = await normalizeInteractiveTaskConfig(req.body?.config || {}, []);
    const payload = {
      ...req.body,
      title,
      config: normalizedConfig,
      steps: normalizeTaskSteps(req.body?.steps, req.body?.description),
      study_id: req.params.studyId,
    };
    const item = await ResearchTask.create(payload);
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
});
router.put('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await ResearchTask.findById(req.params.taskId);
    if (!task) return next(notFound('task not found'));
    const payload = { ...req.body };
    if (payload.title !== undefined) {
      const title = String(payload.title || '').trim();
      if (!title) return next(badRequest('task title required'));
      payload.title = title;
    }
    if (payload.config !== undefined) {
      payload.config = await normalizeInteractiveTaskConfig(payload.config, task.attachments || []);
    }
    if (payload.steps !== undefined || payload.description !== undefined) {
      const stepSource = payload.steps !== undefined ? payload.steps : task.steps;
      const fallbackDescription = payload.description !== undefined ? payload.description : task.description;
      payload.steps = normalizeTaskSteps(stepSource, fallbackDescription);
    }
    const item = await ResearchTask.findByIdAndUpdate(req.params.taskId, payload, { new: true });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
});
router.delete('/tasks/:taskId', async (req, res, next) => {
  const item = await ResearchTask.findByIdAndDelete(req.params.taskId);
  if (!item) return next(notFound('task not found'));
  res.status(204).send();
});

router.post('/tasks/:taskId/attachment', uploadTaskFile.array('files', 20), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) return next(badRequest('file required'));
    const task = await ResearchTask.findById(req.params.taskId);
    if (!task) return next(notFound('task not found'));

    const uploaded = [];
    for (const file of files) {
      const ext = String(file.originalname || '').toLowerCase().split('.').pop();
      const isPdf = file.mimetype === 'application/pdf' || ext === 'pdf';
      const isHtml =
        file.mimetype === 'text/html' ||
        file.mimetype === 'application/xhtml+xml' ||
        ext === 'html' ||
        ext === 'htm';
      if (!isPdf && !isHtml) return next(badRequest('only pdf or html files are allowed'));
      uploaded.push({
        path: `/uploads/task-files/${file.filename}`,
        name: file.originalname || file.filename,
        mime: file.mimetype || (isPdf ? 'application/pdf' : 'text/html'),
        format: isPdf ? 'pdf' : 'html',
        uploaded_at: new Date(),
      });
    }

    const existing = Array.isArray(task.attachments) ? task.attachments : [];
    task.attachments = [...existing, ...uploaded];
    if (!task.attachment_path && uploaded[0]) {
      task.attachment_path = uploaded[0].path;
      task.attachment_name = uploaded[0].name;
      task.attachment_mime = uploaded[0].mime;
      task.content_format = uploaded[0].format;
    } else if (uploaded[0]) {
      task.content_format = uploaded[0].format;
    }
    task.config = await normalizeInteractiveTaskConfig(task.config || {}, task.attachments || []);
    await task.save();

    return res.json(task);
  } catch (err) {
    return next(err);
  }
});

router.delete('/tasks/:taskId/attachment', async (req, res, next) => {
  try {
    const task = await ResearchTask.findById(req.params.taskId);
    if (!task) return next(notFound('task not found'));

    const pathToDelete = String(req.body?.path || '').trim();
    if (!pathToDelete) return next(badRequest('attachment path required'));

    const existing = Array.isArray(task.attachments) ? task.attachments : [];
    const keep = existing.filter((file) => String(file?.path || '') !== pathToDelete);
    if (keep.length === existing.length) return next(notFound('attachment not found'));

    task.attachments = keep;

    const removedFilename = path.basename(pathToDelete);
    try {
      const absolutePath = path.join(TASK_FILES_DIR, removedFilename);
      await fs.unlink(absolutePath);
    } catch {
      // ignore missing local file and keep db cleanup successful
    }

    if (!keep.length) {
      task.attachment_path = '';
      task.attachment_name = '';
      task.attachment_mime = '';
      task.content_format = 'none';
    } else {
      const first = keep[0];
      task.attachment_path = first.path || '';
      task.attachment_name = first.name || '';
      task.attachment_mime = first.mime || '';
      task.content_format = first.format || 'none';
    }

    task.config = await normalizeInteractiveTaskConfig(task.config || {}, keep);
    await task.save();
    return res.json(task);
  } catch (err) {
    return next(err);
  }
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
