import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { Study } from '../models/Study.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { Question } from '../models/Question.js';
import { Answer } from '../models/Answer.js';
import { Card } from '../models/Card.js';
import { CardSort } from '../models/CardSort.js';
import { CardSortColumn } from '../models/CardSortColumn.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { ImageRating } from '../models/ImageRating.js';
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
    const study = await Study.findById(item.study_id, { module_order: 1 });
    if (!study) throw notFound('study not found');
    const modules = study.module_order?.length ? study.module_order : ['questionnaire', 'card_sort', 'image_rating'];

    const needsQuestionnaire = modules.includes('questionnaire');
    const needsCardSort = modules.includes('card_sort');
    const needsImageRating = modules.includes('image_rating');

    const questions = needsQuestionnaire ? await Question.find({ study_id: item.study_id }, { _id: 1 }) : [];
    if (needsQuestionnaire && questions.length > 0) {
      const questionIds = questions.map((q) => String(q._id));
      const answers = await Answer.find(
        { session_id: item._id, question_id: { $in: questionIds } },
        { question_id: 1, response: 1 }
      );
      const answered = new Set(
        answers
          .filter((a) => a.response !== undefined && a.response !== null && String(a.response).trim() !== '')
          .map((a) => String(a.question_id))
      );
      if (answered.size < questionIds.length) {
        throw badRequest('Bitte zuerst alle Interview-Fragen beantworten.');
      }
    }

    if (needsCardSort) {
      const [cards, columns] = await Promise.all([
        Card.find({ study_id: item.study_id }, { _id: 1 }),
        CardSortColumn.find({ study_id: item.study_id, is_active: true }, { _id: 1 }),
      ]);
      if (cards.length > 0 && columns.length === 0) {
        throw badRequest('Card-Sorting-Spalten fehlen. Bitte Admin kontaktieren.');
      }
      if (cards.length > 0) {
        const latestCardSort = await CardSort.findOne({ session_id: item._id }).sort({ created_at: -1 });
        if (!latestCardSort) {
          throw badRequest('Bitte zuerst alle Card-Sorting-Aufgaben fertigstellen.');
        }
        const assignedIds = new Set(
          (latestCardSort.card_groups || []).flatMap((g) => (g.card_ids || []).map((id) => String(id)))
        );
        if (assignedIds.size < cards.length) {
          throw badRequest('Bitte zuerst alle Card-Sorting-Aufgaben fertigstellen.');
        }
      }
    }

    if (needsImageRating) {
      const images = await ImageAsset.find({ study_id: item.study_id }, { _id: 1 });
      if (images.length > 0) {
        const imageIds = images.map((x) => x._id);
        const ratings = await ImageRating.find(
          { session_id: item._id, image_id: { $in: imageIds } },
          { image_id: 1, rating: 1 }
        );
        const rated = new Set(
          ratings
            .filter((r) => r.rating !== undefined && r.rating !== null && Number(r.rating) >= 1)
            .map((r) => String(r.image_id))
        );
        if (rated.size < images.length) {
          throw badRequest('Bitte zuerst alle Bildbewertungen fertigstellen.');
        }
      }
    }

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
