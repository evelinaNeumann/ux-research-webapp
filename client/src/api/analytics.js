import { http } from './http';

export const analyticsApi = {
  studyOverview: (studyId) => http(`/analytics/study/${studyId}`),
  studyChart: (studyId) => http(`/analytics/study/${studyId}/charts`),
};
