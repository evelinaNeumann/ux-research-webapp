import { http } from './http';

export const sessionApi = {
  list: () => http('/sessions'),
  get: (id) => http(`/sessions/${id}`),
  start: (study_id) => http('/sessions', { method: 'POST', body: JSON.stringify({ study_id }) }),
  complete: (id) => http(`/sessions/${id}/complete`, { method: 'PUT' }),
};
