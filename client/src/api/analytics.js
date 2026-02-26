import { http } from './http';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const analyticsApi = {
  studyOverview: (studyId, filters = {}) => http(`/analytics/study/${studyId}${buildQuery(filters)}`),
  studyChart: (studyId, filters = {}) => http(`/analytics/study/${studyId}/charts${buildQuery(filters)}`),
  studyUserPortraits: (studyId) => http(`/analytics/study/${studyId}/user-portraits`),
};
