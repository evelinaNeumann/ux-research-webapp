import { http } from './http';

export const profileApi = {
  options: () => http('/profiles/options'),
  getMyProfiles: () => http('/profiles/me'),
  getStudyProfile: (studyId, flowStudyId = '') =>
    http(`/profiles/study/${studyId}${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getStudyPrefill: (studyId, flowStudyId = '') =>
    http(`/profiles/study/${studyId}/prefill${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  saveStudyProfile: (studyId, payload, flowStudyId = '') =>
    http(`/profiles/study/${studyId}${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
