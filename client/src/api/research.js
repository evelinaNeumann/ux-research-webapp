import { http } from './http';

export const researchApi = {
  submitAnswer: (payload) => http('/answers', { method: 'POST', body: JSON.stringify(payload) }),
  submitCardSort: (payload) => http('/cardsort', { method: 'POST', body: JSON.stringify(payload) }),
  submitImageRating: (payload) => http('/image-rating', { method: 'POST', body: JSON.stringify(payload) }),
};
