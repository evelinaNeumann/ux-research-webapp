import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Answer } from '../models/Answer.js';
import { CardSort } from '../models/CardSort.js';
import { ImageRating } from '../models/ImageRating.js';
import { ResearchTask } from '../models/ResearchTask.js';
import { TaskResponse } from '../models/TaskResponse.js';
import { Session } from '../models/Session.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

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

async function assertSessionOwnership(sessionId, auth) {
  const session = await Session.findById(sessionId);
  if (!session) throw notFound('session not found');
  if (auth.role !== 'admin' && String(session.user_id) !== auth.sub) throw forbidden();
  return session;
}

function assertWritableSession(session) {
  if (session.status === 'done') {
    throw forbidden('session is completed and read-only');
  }
}

router.post('/answers', async (req, res, next) => {
  try {
    const { session_id, question_id, response } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
    assertWritableSession(session);
    const item = await Answer.create({
      session_id,
      user_id: session.user_id,
      study_id: session.study_id,
      question_id,
      response,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/answers/session/:sessionId', async (req, res, next) => {
  try {
    await assertSessionOwnership(req.params.sessionId, req.auth);
    const items = await Answer.find({ session_id: req.params.sessionId });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/cardsort', async (req, res, next) => {
  try {
    const { session_id, card_groups, user_idea_category } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
    assertWritableSession(session);
    const item = await CardSort.create({
      session_id,
      user_id: session.user_id,
      study_id: session.study_id,
      card_groups,
      user_idea_category: {
        custom_columns: Array.isArray(user_idea_category?.custom_columns)
          ? user_idea_category.custom_columns.map((x) => String(x || '').trim()).filter(Boolean)
          : [],
        custom_cards: Array.isArray(user_idea_category?.custom_cards)
          ? user_idea_category.custom_cards
              .map((x) => ({
                label: String(x?.label || '').trim(),
                column: String(x?.column || '').trim(),
              }))
              .filter((x) => x.label)
          : [],
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/cardsort/session/:sessionId', async (req, res, next) => {
  try {
    await assertSessionOwnership(req.params.sessionId, req.auth);
    const item = await CardSort.findOne({ session_id: req.params.sessionId }).sort({ created_at: -1 });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.post('/image-rating', async (req, res, next) => {
  try {
    const { session_id, image_id, rating, feedback, recall_answer } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
    assertWritableSession(session);
    const item = await ImageRating.create({
      session_id,
      user_id: session.user_id,
      study_id: session.study_id,
      image_id,
      rating,
      feedback,
      recall_answer,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/image-rating/session/:sessionId', async (req, res, next) => {
  try {
    await assertSessionOwnership(req.params.sessionId, req.auth);
    const items = await ImageRating.find({ session_id: req.params.sessionId });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/task-response', async (req, res, next) => {
  try {
    const { session_id, task_id, selected_ids, step_index } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
    assertWritableSession(session);

    const task = await ResearchTask.findById(task_id);
    if (!task) throw notFound('task not found');
    if (String(task.study_id) !== String(session.study_id)) throw forbidden();

    const interactive = task.config?.interactive || {};
    const allowed = Array.isArray(interactive.selectable_ids)
      ? interactive.selectable_ids.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    if (!allowed.length) throw badRequest('task has no interactive answers configured');

    const normalizedStepIndex =
      Number.isFinite(Number(step_index)) && Number(step_index) >= 0 ? Number(step_index) : 0;
    const sortedSteps = Array.isArray(task.steps)
      ? [...task.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
      : [];
    const activeStep = sortedSteps[normalizedStepIndex] || null;
    const selected = Array.isArray(selected_ids)
      ? selected_ids.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    const allowedNormalized = Array.from(new Set(allowed.map((x) => normalizeAnswerId(x)).filter(Boolean)));
    const allowedSet = new Set(allowedNormalized);
    const uniqueSelected = Array.from(
      new Set(
        selected
          .map((x) => normalizeAnswerId(x))
          .filter((x) => x && allowedSet.has(x))
      )
    );

    const stepCorrect = Array.isArray(activeStep?.correct_ids)
      ? activeStep.correct_ids
      : [];
    const effectiveCorrectIds = stepCorrect.length
      ? stepCorrect
      : Array.isArray(interactive.correct_ids)
        ? interactive.correct_ids
        : [];
    const correct = Array.from(
      new Set(
        effectiveCorrectIds
          .map((x) => normalizeAnswerId(x))
          .filter((x) => x && allowedSet.has(x))
      )
    );
    const selectedSet = new Set(uniqueSelected);
    const correctSet = new Set(correct);
    const isCorrect =
      selectedSet.size === correctSet.size &&
      uniqueSelected.every((x) => correctSet.has(x)) &&
      correct.every((x) => selectedSet.has(x));

    const now = new Date();
    const item = await TaskResponse.findOneAndUpdate(
      { session_id, task_id, step_index: normalizedStepIndex },
      {
        $set: {
          session_id,
          task_id,
          step_index: normalizedStepIndex,
          user_id: session.user_id,
          study_id: session.study_id,
          selected_ids: uniqueSelected,
          is_correct: isCorrect,
          result_status: isCorrect ? 'correct' : 'incorrect',
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const missing = correct.filter((x) => !selectedSet.has(x));
    const extra = uniqueSelected.filter((x) => !correctSet.has(x));
    res.status(201).json({
      ...item.toObject(),
      compare: {
        selected: uniqueSelected,
        expected: correct,
        missing,
        extra,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/task-response/session/:sessionId', async (req, res, next) => {
  try {
    await assertSessionOwnership(req.params.sessionId, req.auth);
    const items = await TaskResponse.find({ session_id: req.params.sessionId });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;
