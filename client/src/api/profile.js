import { http } from './http';

export const profileApi = {
  options: () => http('/profiles/options'),
  getMyProfiles: () => http('/profiles/me'),
  getStudyProfile: (studyId) => http(`/profiles/study/${studyId}`),
  getStudyPrefill: (studyId) => http(`/profiles/study/${studyId}/prefill`),
  saveStudyProfile: (studyId, payload) =>
    http(`/profiles/study/${studyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
};
