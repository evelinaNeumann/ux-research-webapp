import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  UserStudyProfile,
  USER_PROFILE_AGE_RANGES,
  USER_PROFILE_ROLE_CATEGORIES,
} from '../models/UserStudyProfile.js';
import { Study } from '../models/Study.js';
import { StudyProfileCard } from '../models/StudyProfileCard.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { hasStudyAccessForUser } from '../utils/study-access.js';

const router = Router();
router.use(requireAuth);

router.get('/options', (_req, res) => {
  res.json({
    age_ranges: USER_PROFILE_AGE_RANGES,
    role_categories: USER_PROFILE_ROLE_CATEGORIES,
  });
});

router.get('/study/:studyId', async (req, res, next) => {
  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) throw notFound('study not found');

    if (req.auth.role !== 'admin') {
      const hasAccess = await hasStudyAccessForUser(study, req.auth.sub);
      if (!hasAccess) throw forbidden('study not assigned to user');
    }

    const profile = await UserStudyProfile.findOne({ user_id: req.auth.sub, study_id: req.params.studyId });
    if (!profile) throw notFound('profile not found');
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/prefill', async (req, res, next) => {
  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) throw notFound('study not found');

    if (req.auth.role !== 'admin') {
      const hasAccess = await hasStudyAccessForUser(study, req.auth.sub);
      if (!hasAccess) throw forbidden('study not assigned to user');
    }

    if (!study.inherit_user_profile_points || !study.profile_cards_source_study_id) {
      return res.json({ source_study_id: null, source_study_name: '', key_points: [] });
    }

    const sourceProfile = await UserStudyProfile.findOne({
      user_id: req.auth.sub,
      study_id: study.profile_cards_source_study_id,
    });
    if (!sourceProfile) {
      return res.json({
        source_study_id: study.profile_cards_source_study_id,
        source_study_name: '',
        key_points: [],
      });
    }

    const sourceStudy = await Study.findById(study.profile_cards_source_study_id, { name: 1 });
    const cards = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true }, { label: 1 });
    const allowed = new Set(cards.map((c) => c.label));
    const key_points = (sourceProfile.key_points || []).filter((point) => allowed.has(point)).slice(0, 4);

    res.json({
      source_study_id: study.profile_cards_source_study_id,
      source_study_name: sourceStudy?.name || '',
      key_points,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const items = await UserStudyProfile.find({ user_id: req.auth.sub })
      .populate('study_id', 'name type version')
      .sort({ completed_at: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.put('/study/:studyId', async (req, res, next) => {
  try {
    const { age_range, role_category, role_custom, key_points } = req.body;

    if (!USER_PROFILE_AGE_RANGES.includes(age_range)) throw badRequest('invalid age_range');
    if (!USER_PROFILE_ROLE_CATEGORIES.includes(role_category)) throw badRequest('invalid role_category');
    if (role_category === 'other' && !String(role_custom || '').trim()) {
      throw badRequest('role_custom required for other role');
    }
    const study = await Study.findById(req.params.studyId, { is_active: 1, assign_to_all_users: 1 });
    if (!study) throw notFound('study not found');
    if (req.auth.role !== 'admin') {
      const hasAccess = await hasStudyAccessForUser(study, req.auth.sub);
      if (!hasAccess) throw forbidden('study not assigned to user');
    }

    const cards = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true });
    const allowed = new Set(cards.map((c) => c.label));
    const hasProfileWords = cards.length > 0;
    if (!Array.isArray(key_points)) throw badRequest('key_points must be an array');
    if (hasProfileWords && key_points.length !== 4) {
      throw badRequest('exactly 4 key_points required');
    }
    if (!hasProfileWords && key_points.length > 0) {
      throw badRequest('key_points not allowed for studies without profile words');
    }

    for (const point of key_points) {
      if (!allowed.has(point)) throw badRequest('key_points contain invalid values');
    }

    const profile = await UserStudyProfile.findOneAndUpdate(
      { user_id: req.auth.sub, study_id: req.params.studyId },
      {
        user_id: req.auth.sub,
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
  } catch (err) {
    next(err);
  }
});

export default router;
