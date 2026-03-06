import { http } from './http';

export const sessionApi = {
  list: () => http('/sessions'),
  get: (id) => http(`/sessions/${id}`),
  start: (study_id, flow_study_id = '') =>
    http('/sessions', { method: 'POST', body: JSON.stringify({ study_id, flow_study_id: flow_study_id || undefined }) }),
  complete: (id) => http(`/sessions/${id}/complete`, { method: 'PUT' }),
};
