import { http } from './http';

export const studyApi = {
  list: () => http('/studies'),
  getById: (id) => http(`/studies/${id}`),
  getQuestions: (id) => http(`/studies/${id}/questions`),
  getCards: (id) => http(`/studies/${id}/cards`),
  getImages: (id) => http(`/studies/${id}/images`),
  create: (payload) => http('/studies', { method: 'POST', body: JSON.stringify(payload) }),
};
