import { http } from './http';

export const adminApi = {
  listUsers: () => http('/admin/users'),
  setUserRole: (userId, role) =>
    http(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (userId) => http(`/admin/users/${userId}`, { method: 'DELETE' }),
  listAssignments: (studyId) => http(`/admin/studies/${studyId}/assignments`),
  assignUserToStudy: (studyId, user_id) =>
    http(`/admin/studies/${studyId}/assignments`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  removeAssignment: (studyId, userId) =>
    http(`/admin/studies/${studyId}/assignments/${userId}`, { method: 'DELETE' }),
  listQuestions: (studyId) => http(`/admin/studies/${studyId}/questions`),
  createQuestion: (studyId, payload) =>
    http(`/admin/studies/${studyId}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  listCards: (studyId) => http(`/admin/studies/${studyId}/cards`),
  createCard: (studyId, payload) =>
    http(`/admin/studies/${studyId}/cards`, { method: 'POST', body: JSON.stringify(payload) }),
  listTasks: (studyId) => http(`/admin/studies/${studyId}/tasks`),
  createTask: (studyId, payload) =>
    http(`/admin/studies/${studyId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
};
