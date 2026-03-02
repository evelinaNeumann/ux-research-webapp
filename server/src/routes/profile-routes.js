import { Router } from 'express';
import { requireAuth, requirePrivacyConsent } from '../middleware/auth.js';
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
router.use(requireAuth, requirePrivacyConsent);

async function findLatestDemographicsProfile(userId) {
  return UserStudyProfile.findOne({
    user_id: userId,
    age_range: { $in: USER_PROFILE_AGE_RANGES },
    role_category: { $in: USER_PROFILE_ROLE_CATEGORIES },
  }).sort({ completed_at: -1, _id: -1 });
}

function hasValidDemographics(profile) {
  return (
    USER_PROFILE_AGE_RANGES.includes(String(profile?.age_range || '')) &&
    USER_PROFILE_ROLE_CATEGORIES.includes(String(profile?.role_category || ''))
  );
}

async function getActiveProfileCardLabels(studyId) {
  const cards = await StudyProfileCard.find({ study_id: studyId, is_active: true }, { label: 1 });
  return cards.map((card) => String(card.label || '').trim()).filter(Boolean);
}

async function getInheritedKeyPointsForStudy(study, userId, allowedLabels = null) {
  const allowReuse = !study?.ask_key_points_again;
  if (!allowReuse) return [];

  const labels = Array.isArray(allowedLabels) ? allowedLabels : await getActiveProfileCardLabels(study._id);
  const allowed = new Set(labels);

  if (study?.profile_cards_source_study_id) {
    const sourceProfile = await UserStudyProfile.findOne(
      { user_id: userId, study_id: study.profile_cards_source_study_id },
      { key_points: 1 }
    );
    if (sourceProfile) {
      const fromSource = (sourceProfile.key_points || []).filter((point) => allowed.has(point)).slice(0, 4);
      if (fromSource.length === 4) return fromSource;
    }
  }

  const latestWithKeyPoints = await UserStudyProfile.findOne(
    { user_id: userId, key_points: { $exists: true, $ne: [] } },
    { key_points: 1 }
  ).sort({ completed_at: -1, _id: -1 });
  if (!latestWithKeyPoints) return [];
  return (latestWithKeyPoints.key_points || []).filter((point) => allowed.has(point)).slice(0, 4);
}

async function ensureStudyProfileForUser(study, userId) {
  let profile = await UserStudyProfile.findOne({ user_id: userId, study_id: study._id });
  const cardLabels = await getActiveProfileCardLabels(study._id);
  const hasProfileWords = cardLabels.length > 0;
  const inheritedKeyPoints = hasProfileWords ? await getInheritedKeyPointsForStudy(study, userId, cardLabels) : [];
  const latestProfile = !study.ask_demographics_again ? await findLatestDemographicsProfile(userId) : null;

  if (profile) {
    const patch = {};
    if (!hasValidDemographics(profile) && hasValidDemographics(latestProfile)) {
      patch.age_range = latestProfile.age_range;
      patch.role_category = latestProfile.role_category;
      patch.role_custom =
        latestProfile.role_category === 'other' ? String(latestProfile.role_custom || '').trim() : '';
    }
    if (
      hasProfileWords &&
      (!Array.isArray(profile.key_points) || profile.key_points.length !== 4) &&
      inheritedKeyPoints.length === 4
    ) {
      patch.key_points = inheritedKeyPoints;
    }
    if (Object.keys(patch).length > 0) {
      patch.completed_at = new Date();
      profile = await UserStudyProfile.findOneAndUpdate(
        { user_id: userId, study_id: study._id },
        patch,
        { new: true }
      );
    }
    return profile;
  }

  if (!hasValidDemographics(latestProfile)) return null;
  profile = await UserStudyProfile.findOneAndUpdate(
    { user_id: userId, study_id: study._id },
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
  return profile;
}

async function hasCompleteProfile(studyId, profile) {
  if (!profile || !hasValidDemographics(profile)) return false;
  const profileCardCount = await StudyProfileCard.countDocuments({ study_id: studyId, is_active: true });
  if (!profileCardCount) return true;
  return Array.isArray(profile.key_points) && profile.key_points.length === 4;
}

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

    const profile = await ensureStudyProfileForUser(study, req.auth.sub);
    const completeProfile = await hasCompleteProfile(req.params.studyId, profile);
    if (!completeProfile) throw notFound('profile not found');
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

    const latestProfile = await findLatestDemographicsProfile(req.auth.sub);
    const demographics = latestProfile
      ? {
          age_range: latestProfile.age_range,
          role_category: latestProfile.role_category,
          role_custom: latestProfile.role_custom || '',
          source_study_id: latestProfile.study_id || null,
        }
      : null;

    if (study.ask_key_points_again) {
      return res.json({
        source_study_id: null,
        source_study_name: '',
        key_points: [],
        ask_demographics_again: !!study.ask_demographics_again,
        ask_key_points_again: !!study.ask_key_points_again,
        demographics,
      });
    }

    const cards = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true }, { label: 1 });
    const key_points = await getInheritedKeyPointsForStudy(
      study,
      req.auth.sub,
      cards.map((c) => String(c.label || '').trim()).filter(Boolean)
    );
    if (key_points.length !== 4) {
      return res.json({
        source_study_id: study.profile_cards_source_study_id,
        source_study_name: '',
        key_points: [],
        ask_demographics_again: !!study.ask_demographics_again,
        ask_key_points_again: !!study.ask_key_points_again,
        demographics,
      });
    }

    const sourceStudy = study.profile_cards_source_study_id
      ? await Study.findById(study.profile_cards_source_study_id, { name: 1 })
      : null;

    res.json({
      source_study_id: study.profile_cards_source_study_id,
      source_study_name: sourceStudy?.name || '',
      key_points,
      ask_demographics_again: !!study.ask_demographics_again,
      ask_key_points_again: !!study.ask_key_points_again,
      demographics,
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
    const study = await Study.findById(req.params.studyId, {
      is_active: 1,
      assign_to_all_users: 1,
      ask_demographics_again: 1,
      ask_key_points_again: 1,
      inherit_user_profile_points: 1,
      profile_cards_source_study_id: 1,
    });
    if (!study) throw notFound('study not found');
    if (req.auth.role !== 'admin') {
      const hasAccess = await hasStudyAccessForUser(study, req.auth.sub);
      if (!hasAccess) throw forbidden('study not assigned to user');
    }

    const existingProfile = await UserStudyProfile.findOne({
      user_id: req.auth.sub,
      study_id: req.params.studyId,
    });
    const latestProfile = !study.ask_demographics_again ? await findLatestDemographicsProfile(req.auth.sub) : null;

    const resolvedAgeRange = String(age_range || existingProfile?.age_range || latestProfile?.age_range || '');
    const resolvedRoleCategory = String(
      role_category || existingProfile?.role_category || latestProfile?.role_category || ''
    );
    const resolvedRoleCustomRaw =
      role_custom !== undefined
        ? role_custom
        : existingProfile?.role_custom || latestProfile?.role_custom || '';
    const resolvedRoleCustom = String(resolvedRoleCustomRaw || '').trim();

    if (!USER_PROFILE_AGE_RANGES.includes(resolvedAgeRange)) throw badRequest('invalid age_range');
    if (!USER_PROFILE_ROLE_CATEGORIES.includes(resolvedRoleCategory)) throw badRequest('invalid role_category');
    if (resolvedRoleCategory === 'other' && !resolvedRoleCustom) {
      throw badRequest('role_custom required for other role');
    }

    const cards = await StudyProfileCard.find({ study_id: req.params.studyId, is_active: true });
    const allowed = new Set(cards.map((c) => c.label));
    const hasProfileWords = cards.length > 0;
    if (!Array.isArray(key_points)) throw badRequest('key_points must be an array');
    const inheritedKeyPoints = hasProfileWords
      ? await getInheritedKeyPointsForStudy(
          study,
          req.auth.sub,
          cards.map((c) => String(c.label || '').trim()).filter(Boolean)
        )
      : [];
    const resolvedKeyPoints =
      hasProfileWords && key_points.length !== 4 && inheritedKeyPoints.length === 4
        ? inheritedKeyPoints
        : key_points;
    if (hasProfileWords && resolvedKeyPoints.length !== 4) {
      throw badRequest('exactly 4 key_points required');
    }
    if (!hasProfileWords && resolvedKeyPoints.length > 0) {
      throw badRequest('key_points not allowed for studies without profile words');
    }

    for (const point of resolvedKeyPoints) {
      if (!allowed.has(point)) throw badRequest('key_points contain invalid values');
    }

    const profile = await UserStudyProfile.findOneAndUpdate(
      { user_id: req.auth.sub, study_id: req.params.studyId },
      {
        user_id: req.auth.sub,
        study_id: req.params.studyId,
        age_range: resolvedAgeRange,
        role_category: resolvedRoleCategory,
        role_custom: resolvedRoleCategory === 'other' ? resolvedRoleCustom : '',
        key_points: resolvedKeyPoints,
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
