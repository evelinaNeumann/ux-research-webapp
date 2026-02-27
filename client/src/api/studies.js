import { http } from './http';

export const studyApi = {
  list: () => http('/studies'),
  getById: (id) => http(`/studies/${id}`),
  getQuestions: (id) => http(`/studies/${id}/questions`),
  getCards: (id) => http(`/studies/${id}/cards`),
  getCardSortColumns: (id) => http(`/studies/${id}/card-sort-columns`),
  getImages: (id) => http(`/studies/${id}/images`),
  getTasks: (id) => http(`/studies/${id}/tasks`),
  getProfileCards: (id) => http(`/studies/${id}/profile-cards`),
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
