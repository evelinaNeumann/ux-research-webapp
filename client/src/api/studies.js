import { http } from './http';

export const studyApi = {
  list: () => http('/studies'),
  create: (payload) => http('/studies', { method: 'POST', body: JSON.stringify(payload) }),
};
