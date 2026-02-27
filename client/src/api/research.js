import { http } from './http';

export const researchApi = {
  submitAnswer: (payload) => http('/answers', { method: 'POST', body: JSON.stringify(payload) }),
  getAnswersBySession: (sessionId) => http(`/answers/session/${sessionId}`),
  submitCardSort: (payload) => http('/cardsort', { method: 'POST', body: JSON.stringify(payload) }),
  getCardSortBySession: (sessionId) => http(`/cardsort/session/${sessionId}`),
  submitImageRating: (payload) => http('/image-rating', { method: 'POST', body: JSON.stringify(payload) }),
  getImageRatingsBySession: (sessionId) => http(`/image-rating/session/${sessionId}`),
  submitTaskResponse: (payload) => http('/task-response', { method: 'POST', body: JSON.stringify(payload) }),
  getTaskResponsesBySession: (sessionId) => http(`/task-response/session/${sessionId}`),
};
