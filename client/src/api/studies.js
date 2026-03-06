import { http } from './http';

export const studyApi = {
  list: () => http('/studies'),
  getById: (id, flowStudyId = '') =>
    http(`/studies/${id}${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getComposedSections: (id) => http(`/studies/${id}/composed-sections`),
  getQuestions: (id, flowStudyId = '') =>
    http(`/studies/${id}/questions${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getCards: (id, flowStudyId = '') =>
    http(`/studies/${id}/cards${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getCardSortColumns: (id, flowStudyId = '') =>
    http(`/studies/${id}/card-sort-columns${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getImages: (id, flowStudyId = '') =>
    http(`/studies/${id}/images${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getTasks: (id, flowStudyId = '') =>
    http(`/studies/${id}/tasks${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  getProfileCards: (id, flowStudyId = '') =>
    http(`/studies/${id}/profile-cards${flowStudyId ? `?flow_study_id=${encodeURIComponent(flowStudyId)}` : ''}`),
  create: (payload) => http('/studies', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => http(`/studies/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  uploadBriefPdf: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return http(`/studies/${id}/brief-pdf`, { method: 'POST', body: formData });
  },
  importProfileCards: (id, payload) =>
    http(`/studies/${id}/profile-cards/import`, { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id) => http(`/studies/${id}`, { method: 'DELETE' }),
};
