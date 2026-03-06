import { Router } from 'express';
import { Study } from '../models/Study.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { Question } from '../models/Question.js';
import { Card } from '../models/Card.js';
import { CardSortColumn } from '../models/CardSortColumn.js';
import { ImageAsset } from '../models/ImageAsset.js';
import { StudyProfileCard } from '../models/StudyProfileCard.js';
import { ResearchTask } from '../models/ResearchTask.js';
import { uploadStudyPdf } from '../middleware/upload-study-pdf.js';
import { requireAuth, requirePrivacyConsent, requireRole } from '../middleware/auth.js';
import { getPagination } from '../middleware/pagination.js';
import { notFound, badRequest } from '../utils/errors.js';
import { hasStudyAccessForUser } from '../utils/study-access.js';

const router = Router();
router.use(requireAuth, requirePrivacyConsent);

function moduleOrderForStudyType(type) {
  if (type === 'questionnaire') return ['questionnaire'];
  if (type === 'card_sort') return ['card_sort'];
  if (type === 'image_rating') return ['image_rating'];
  if (type === 'task_work') return [];
  return ['questionnaire', 'card_sort', 'image_rating'];
}

async function assertStudyAccess(studyId, auth) {
  const study = await Study.findById(studyId);
  if (!study) throw notFound('study not found');
  if (auth.role !== 'admin') {
    const hasAccess = await hasStudyAccessForUser(study, auth.sub);
    if (!hasAccess) throw notFound('study not found');
  }
  return study;
}

async function validateProfileInheritanceConfig({
  targetStudyId = null,
  profile_cards_source_study_id,
  inherit_profile_cards,
  inherit_user_profile_points,
}) {
  const sourceId = profile_cards_source_study_id || null;
  const inheritanceEnabled = !!inherit_profile_cards || !!inherit_user_profile_points;

  if (!inheritanceEnabled) {
    return { sourceId: null, inheritProfileCards: false, inheritUserPoints: false };
  }

  if (!sourceId) {
    throw badRequest('source study required when inheritance is enabled');
  }
  if (targetStudyId && String(targetStudyId) === String(sourceId)) {
    throw badRequest('source study cannot be the same as target study');
  }

  const sourceStudy = await Study.findById(sourceId);
  if (!sourceStudy) throw notFound('source study not found');

  return {
    sourceId: sourceStudy._id,
    inheritProfileCards: !!inherit_profile_cards,
    inheritUserPoints: !!inherit_user_profile_points,
  };
}

async function validateComposedSections(targetStudyId = null, composed_sections = undefined) {
  if (composed_sections === undefined) return undefined;
  if (!Array.isArray(composed_sections)) throw badRequest('composed_sections must be an array');

  const normalized = composed_sections
    .map((item, idx) => ({
      study_id: String(item?.study_id || '').trim(),
      order_index: Number.isFinite(Number(item?.order_index)) ? Number(item.order_index) : idx,
    }))
    .filter((item) => item.study_id);

  if (normalized.length === 0) return [];

  const uniqueIds = Array.from(new Set(normalized.map((item) => item.study_id)));
  if (targetStudyId && uniqueIds.some((id) => String(id) === String(targetStudyId))) {
    throw badRequest('composed section cannot reference the same study');
  }

  const existingStudies = await Study.find({ _id: { $in: uniqueIds } }, { _id: 1 }).lean();
  if (existingStudies.length !== uniqueIds.length) throw badRequest('one or more composed section studies not found');

  return normalized
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
    .map((item, idx) => ({ study_id: item.study_id, order_index: idx }));
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let query = {};
    if (req.auth.role !== 'admin') {
      const [activeAssignments, inactiveAssignments] = await Promise.all([
        StudyAssignment.find({ user_id: req.auth.sub, is_active: true }, { study_id: 1 }),
        StudyAssignment.find({ user_id: req.auth.sub, is_active: false }, { study_id: 1 }),
      ]);
      const activeStudyIds = activeAssignments.map((x) => x.study_id);
      const blockedStudyIds = inactiveAssignments.map((x) => x.study_id);
      query = {
        is_active: true,
        $or: [
          { _id: { $in: activeStudyIds } },
          { assign_to_all_users: true, _id: { $nin: blockedStudyIds } },
        ],
      };
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

router.get('/:id', async (req, res, next) => {
  try {
    const study = await assertStudyAccess(req.params.id, req.auth);
    res.json(study);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/questions', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await Question.find({ study_id: req.params.id }).sort({ _id: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/cards', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await Card.find({ study_id: req.params.id }).sort({ _id: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/card-sort-columns', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await CardSortColumn.find({ study_id: req.params.id, is_active: true }).sort({ order_index: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/images', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await ImageAsset.find({ study_id: req.params.id }).sort({ uploaded_at: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/tasks', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await ResearchTask.find({ study_id: req.params.id }).sort({ order_index: 1, _id: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/profile-cards', async (req, res, next) => {
  try {
    await assertStudyAccess(req.params.id, req.auth);
    const items = await StudyProfileCard.find({ study_id: req.params.id, is_active: true }).sort({ order_index: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      description,
      image_rating_prompt,
      image_rating_card_pool,
      image_rating_tasks,
      type,
      module_order,
      profile_cards_source_study_id,
      inherit_profile_cards,
      inherit_user_profile_points,
      ask_demographics_again,
      ask_key_points_again,
      composed_sections,
    } = req.body;
    if (!name) throw badRequest('name required');
    const inheritance = await validateProfileInheritanceConfig({
      profile_cards_source_study_id,
      inherit_profile_cards,
      inherit_user_profile_points,
    });
    const study = await Study.create({
      name,
      description,
      image_rating_prompt: image_rating_prompt || '',
      image_rating_card_pool: Array.isArray(image_rating_card_pool) ? image_rating_card_pool : [],
      image_rating_tasks: Array.isArray(image_rating_tasks) ? image_rating_tasks : [],
      type,
      module_order: module_order !== undefined ? module_order : moduleOrderForStudyType(type),
      profile_cards_source_study_id: inheritance.sourceId,
      inherit_profile_cards: inheritance.inheritProfileCards,
      inherit_user_profile_points: inheritance.inheritUserPoints,
      ask_demographics_again: !!ask_demographics_again,
      ask_key_points_again: !!ask_key_points_again,
      composed_sections: (await validateComposedSections(null, composed_sections)) || [],
    });
    res.status(201).json(study);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      description,
      image_rating_prompt,
      image_rating_card_pool,
      image_rating_tasks,
      type,
      is_active,
      module_order,
      profile_cards_source_study_id,
      inherit_profile_cards,
      inherit_user_profile_points,
      ask_demographics_again,
      ask_key_points_again,
      composed_sections,
    } = req.body;
    const study = await Study.findById(req.params.id);
    if (!study) throw notFound('study not found');

    if (name !== undefined) study.name = name;
    if (description !== undefined) study.description = description;
    if (image_rating_prompt !== undefined) study.image_rating_prompt = String(image_rating_prompt || '');
    if (image_rating_card_pool !== undefined) {
      study.image_rating_card_pool = Array.isArray(image_rating_card_pool) ? image_rating_card_pool : [];
    }
    if (image_rating_tasks !== undefined) {
      study.image_rating_tasks = Array.isArray(image_rating_tasks) ? image_rating_tasks : [];
    }
    if (type !== undefined) {
      study.type = type;
      if (module_order === undefined) {
        study.module_order = moduleOrderForStudyType(type);
      }
    }
    if (is_active !== undefined) study.is_active = is_active;
    if (ask_demographics_again !== undefined) study.ask_demographics_again = !!ask_demographics_again;
    if (ask_key_points_again !== undefined) study.ask_key_points_again = !!ask_key_points_again;
    if (module_order !== undefined) study.module_order = module_order;
    if (composed_sections !== undefined) {
      study.composed_sections = await validateComposedSections(study._id, composed_sections);
    }
    if (
      profile_cards_source_study_id !== undefined ||
      inherit_profile_cards !== undefined ||
      inherit_user_profile_points !== undefined
    ) {
      const inheritance = await validateProfileInheritanceConfig({
        targetStudyId: study._id,
        profile_cards_source_study_id:
          profile_cards_source_study_id !== undefined
            ? profile_cards_source_study_id
            : study.profile_cards_source_study_id,
        inherit_profile_cards:
          inherit_profile_cards !== undefined ? inherit_profile_cards : study.inherit_profile_cards,
        inherit_user_profile_points:
          inherit_user_profile_points !== undefined
            ? inherit_user_profile_points
            : study.inherit_user_profile_points,
      });
      study.profile_cards_source_study_id = inheritance.sourceId;
      study.inherit_profile_cards = inheritance.inheritProfileCards;
      study.inherit_user_profile_points = inheritance.inheritUserPoints;
    }
    study.version += 1;

    await study.save();
    res.json(study);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/profile-cards/import', requireRole('admin'), async (req, res, next) => {
  try {
    const { source_study_id, inherit_user_profile_points } = req.body;
    if (!source_study_id) throw badRequest('source_study_id required');

    const targetStudy = await Study.findById(req.params.id);
    if (!targetStudy) throw notFound('study not found');
    if (String(targetStudy._id) === String(source_study_id)) {
      throw badRequest('source study cannot be the same as target study');
    }

    const sourceStudy = await Study.findById(source_study_id);
    if (!sourceStudy) throw notFound('source study not found');

    const sourceCards = await StudyProfileCard.find({ study_id: sourceStudy._id, is_active: true }).sort({
      order_index: 1,
      _id: 1,
    });
    if (!sourceCards.length) throw badRequest('source study has no active profile cards');

    const cardsToCopy = sourceCards.slice(0, 8);
    await StudyProfileCard.deleteMany({ study_id: targetStudy._id });
    await StudyProfileCard.insertMany(
      cardsToCopy.map((card, index) => ({
        study_id: targetStudy._id,
        label: card.label,
        order_index: index,
        is_active: true,
      }))
    );

    targetStudy.profile_cards_source_study_id = sourceStudy._id;
    targetStudy.inherit_profile_cards = true;
    targetStudy.inherit_user_profile_points = !!inherit_user_profile_points;
    await targetStudy.save();

    const cards = await StudyProfileCard.find({ study_id: targetStudy._id, is_active: true }).sort({ order_index: 1 });
    res.json({ study: targetStudy, cards });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/brief-pdf', requireRole('admin'), uploadStudyPdf.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('pdf file required');
    const study = await Study.findById(req.params.id);
    if (!study) throw notFound('study not found');

    study.brief_pdf_path = `/uploads/study-briefs/${req.file.filename}`;
    study.brief_pdf_name = req.file.originalname;
    await study.save();

    res.json(study);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/composed-sections', async (req, res, next) => {
  try {
    const parentStudy = await assertStudyAccess(req.params.id, req.auth);
    const sortedSections = Array.isArray(parentStudy.composed_sections)
      ? [...parentStudy.composed_sections].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
      : [];
    const sectionIds = sortedSections.map((item) => item.study_id).filter(Boolean);
    if (sectionIds.length === 0) return res.json({ study_id: parentStudy._id, sections: [] });

    const sectionStudies = await Study.find({ _id: { $in: sectionIds } }, {
      _id: 1,
      name: 1,
      type: 1,
      brief_pdf_path: 1,
      brief_pdf_name: 1,
      is_active: 1,
    }).lean();
    const byId = Object.fromEntries(sectionStudies.map((item) => [String(item._id), item]));
    const sections = sortedSections
      .map((item) => byId[String(item.study_id)] || null)
      .filter(Boolean);

    res.json({ study_id: parentStudy._id, sections });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await Study.findByIdAndDelete(req.params.id);
    if (!deleted) throw notFound('study not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
