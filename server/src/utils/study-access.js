import { StudyAssignment } from '../models/StudyAssignment.js';
import { Study } from '../models/Study.js';

async function hasDirectStudyAccess(study, userId) {
  if (!study || !study.is_active) return false;
  const assignment = await StudyAssignment.findOne(
    { study_id: study._id, user_id: userId },
    { is_active: 1 }
  );
  if (assignment) return assignment.is_active === true;
  return study.assign_to_all_users === true;
}

export async function hasStudyAccessForUser(study, userId, options = {}) {
  const directAccess = await hasDirectStudyAccess(study, userId);
  if (directAccess) return true;

  const flowStudyId = String(options?.flowStudyId || '').trim();
  if (!flowStudyId || !study?._id) return false;

  const parentStudy = await Study.findById(flowStudyId, {
    _id: 1,
    is_active: 1,
    assign_to_all_users: 1,
    composed_sections: 1,
  });
  if (!parentStudy) return false;

  const includesSection = Array.isArray(parentStudy.composed_sections)
    && parentStudy.composed_sections.some((entry) => String(entry?.study_id) === String(study._id));
  if (!includesSection) return false;

  return hasDirectStudyAccess(parentStudy, userId);
}
