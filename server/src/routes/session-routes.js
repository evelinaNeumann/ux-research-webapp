import { Router } from 'express';
import { requireAuth, requirePrivacyConsent } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { Study } from '../models/Study.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { StudyProfileCard } from '../models/StudyProfileCard.js';
import { Question } from '../models/Question.js';
import { Answer } from '../models/Answer.js';
import { Card } from '../models/Card.js';
import { CardSort } from '../models/CardSort.js';
import { CardSortColumn } from '../models/CardSortColumn.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { ImageRating } from '../models/ImageRating.js';
import { ImageTaskResponse } from '../models/ImageTaskResponse.js';
import { ResearchTask } from '../models/ResearchTask.js';
import { TaskResponse } from '../models/TaskResponse.js';
import { getPagination } from '../middleware/pagination.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';
import { hasStudyAccessForUser } from '../utils/study-access.js';

const router = Router();
router.use(requireAuth, requirePrivacyConsent);

function defaultModulesForStudy(study) {
  const type = String(study?.type || 'mixed');
  if (type === 'questionnaire') return ['questionnaire'];
  if (type === 'card_sort') return ['card_sort'];
  if (type === 'image_rating') return ['image_rating'];
  if (type === 'task_work') return [];
  return ['questionnaire', 'card_sort', 'image_rating'];
}

async function resolveProfileForSessionStart(study, userId) {
  const cards = await StudyProfileCard.find({ study_id: study._id, is_active: true }, { label: 1 });
  const cardLabels = cards.map((card) => String(card.label || '').trim()).filter(Boolean);
  const hasProfileWords = cardLabels.length > 0;
  let inheritedKeyPoints = [];
  if (hasProfileWords && !study.ask_key_points_again) {
    const allowed = new Set(cardLabels);
    if (study.profile_cards_source_study_id) {
      const sourceProfile = await UserStudyProfile.findOne(
        { user_id: userId, study_id: study.profile_cards_source_study_id },
        { key_points: 1 }
      );
      if (sourceProfile) {
        inheritedKeyPoints = (sourceProfile.key_points || []).filter((point) => allowed.has(point)).slice(0, 4);
      }
    }
    if (inheritedKeyPoints.length !== 4) {
      const latestWithKeyPoints = await UserStudyProfile.findOne(
        { user_id: userId, key_points: { $exists: true, $ne: [] } },
        { key_points: 1 }
      ).sort({ completed_at: -1, _id: -1 });
      if (latestWithKeyPoints) {
        inheritedKeyPoints = (latestWithKeyPoints.key_points || [])
          .filter((point) => allowed.has(point))
          .slice(0, 4);
      }
    }
  }

  let profile = await UserStudyProfile.findOne({ study_id: study._id, user_id: userId });
  const latestProfile = !study.ask_demographics_again
    ? await UserStudyProfile.findOne({
        user_id: userId,
        age_range: { $exists: true, $ne: '' },
        role_category: { $exists: true, $ne: '' },
      }).sort({ completed_at: -1, _id: -1 })
    : null;

  if (profile) {
    const patch = {};
    if ((!profile.age_range || !profile.role_category) && latestProfile) {
      patch.age_range = latestProfile.age_range;
      patch.role_category = latestProfile.role_category;
      patch.role_custom =
        latestProfile.role_category === 'other' ? String(latestProfile.role_custom || '').trim() : '';
    }
    if (
      hasProfileWords &&
      inheritedKeyPoints.length === 4 &&
      (!Array.isArray(profile.key_points) || profile.key_points.length !== 4)
    ) {
      patch.key_points = inheritedKeyPoints;
    }
    if (Object.keys(patch).length > 0) {
      patch.completed_at = new Date();
      profile = await UserStudyProfile.findOneAndUpdate({ study_id: study._id, user_id: userId }, patch, { new: true });
    }
    return { profile, profileCardCount: cardLabels.length };
  }

  if (!latestProfile) return { profile: null, profileCardCount: cardLabels.length };

  profile = await UserStudyProfile.findOneAndUpdate(
    { study_id: study._id, user_id: userId },
    {
      user_id: userId,
      study_id: study._id,
      age_range: latestProfile.age_range,
      role_category: latestProfile.role_category,
      role_custom: latestProfile.role_category === 'other' ? String(latestProfile.role_custom || '').trim() : '',
      key_points: inheritedKeyPoints.length === 4 ? inheritedKeyPoints : [],
      completed_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { profile, profileCardCount: cardLabels.length };
}

function isCompleteProfileForSession(profile, profileCardCount) {
  const hasDemographics = !!profile?.age_range && !!profile?.role_category;
  if (!hasDemographics) return false;
  if (!profileCardCount) return true;
  return Array.isArray(profile?.key_points) && profile.key_points.length === 4;
}

router.post('/', async (req, res, next) => {
  try {
    const { study_id } = req.body;
    if (!study_id) throw badRequest('study_id required');

    const study = await Study.findById(study_id);
    if (!study) throw notFound('study not found');
    if (req.auth.role !== 'admin') {
      const hasAccess = await hasStudyAccessForUser(study, req.auth.sub);
      if (!hasAccess) throw forbidden('study not assigned to user');

      const { profile, profileCardCount } = await resolveProfileForSessionStart(study, req.auth.sub);
      if (!isCompleteProfileForSession(profile, profileCardCount)) throw badRequest('profile setup required');
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
      current_module: (study.module_order?.[0] || defaultModulesForStudy(study)[0] || 'task_work'),
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
    const study = await Study.findById(item.study_id, { module_order: 1, type: 1, image_rating_tasks: 1 });
    if (!study) throw notFound('study not found');
    const modules = study.module_order?.length ? study.module_order : defaultModulesForStudy(study);

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
      const imageTaskDefs = Array.isArray(study.image_rating_tasks)
        ? study.image_rating_tasks.filter((task) => String(task?.task_id || '').trim())
        : [];
      if (imageTaskDefs.length > 0) {
        const requiredTaskIds = imageTaskDefs.map((task) => String(task.task_id));
        const taskResponses = await ImageTaskResponse.find(
          { session_id: item._id, task_id: { $in: requiredTaskIds } },
          { task_id: 1 }
        );
        const respondedTaskIds = new Set(taskResponses.map((row) => String(row.task_id)));
        const missingTask = imageTaskDefs.find((task) => !respondedTaskIds.has(String(task.task_id)));
        if (missingTask) {
          throw badRequest(`Bitte zuerst die Bild-Aufgabe "${String(missingTask.title || missingTask.type || 'Bildaufgabe')}" fertigstellen.`);
        }
      } else {
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
    }

    const interactiveTasks = await ResearchTask.find(
      { study_id: item.study_id, 'config.interactive.enabled': true },
      { _id: 1, title: 1, steps: 1 }
    );
    if (interactiveTasks.length > 0) {
      const requiredTaskIds = interactiveTasks.map((t) => String(t._id));
      const responses = await TaskResponse.find(
        { session_id: item._id, task_id: { $in: requiredTaskIds } },
        { task_id: 1, step_index: 1 }
      );
      const answeredByTask = responses.reduce((acc, row) => {
        const key = String(row.task_id);
        if (!acc[key]) acc[key] = new Set();
        acc[key].add(Number(row.step_index || 0));
        return acc;
      }, {});
      const missing = interactiveTasks.filter((task) => {
        const taskId = String(task._id);
        const validSteps = Array.isArray(task.steps)
          ? task.steps.filter((step) => String(step?.prompt || '').trim())
          : [];
        const requiredCount = validSteps.length > 0 ? validSteps.length : 1;
        return (answeredByTask[taskId]?.size || 0) < requiredCount;
      });
      if (missing.length > 0) {
        const missingDetails = [];
        for (const task of missing) {
          const taskId = String(task._id);
          const title = String(task.title || `Task ${taskId}`);
          const validSteps = Array.isArray(task.steps)
            ? task.steps.filter((step) => String(step?.prompt || '').trim())
            : [];
          const requiredCount = validSteps.length > 0 ? validSteps.length : 1;
          const answered = answeredByTask[taskId] || new Set();
          for (let stepIdx = 0; stepIdx < requiredCount; stepIdx += 1) {
            if (!answered.has(stepIdx)) {
              missingDetails.push(`${title} - Schritt ${stepIdx + 1}`);
            }
          }
        }
        const suffix = missingDetails.length > 0 ? ` Fehlend: ${missingDetails.join(', ')}` : '';
        throw badRequest(`Bitte zuerst alle interaktiven Aufgaben beantworten.${suffix}`);
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
