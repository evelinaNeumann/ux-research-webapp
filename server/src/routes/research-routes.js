import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Answer } from '../models/Answer.js';
import { CardSort } from '../models/CardSort.js';
import { ImageRating } from '../models/ImageRating.js';
import { Session } from '../models/Session.js';
import { notFound, forbidden } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

async function assertSessionOwnership(sessionId, auth) {
  const session = await Session.findById(sessionId);
  if (!session) throw notFound('session not found');
  if (auth.role !== 'admin' && String(session.user_id) !== auth.sub) throw forbidden();
  return session;
}

router.post('/answers', async (req, res, next) => {
  try {
    const { session_id, question_id, response } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
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
    const { session_id, card_groups } = req.body;
    const session = await assertSessionOwnership(session_id, req.auth);
    const item = await CardSort.create({
      session_id,
      user_id: session.user_id,
      study_id: session.study_id,
      card_groups,
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

export default router;
