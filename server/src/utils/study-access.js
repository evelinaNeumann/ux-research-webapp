import { StudyAssignment } from '../models/StudyAssignment.js';

export async function hasStudyAccessForUser(study, userId) {
  if (!study || !study.is_active) return false;
  const assignment = await StudyAssignment.findOne(
    { study_id: study._id, user_id: userId },
    { is_active: 1 }
  );
  if (assignment) return assignment.is_active === true;
  return study.assign_to_all_users === true;
}
