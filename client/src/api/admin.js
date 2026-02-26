import { http } from './http';

export const adminApi = {
  listUsers: () => http('/admin/users'),
  listUserProfiles: (userId) => http(`/admin/users/${userId}/profiles`),
  updateUserProfile: (userId, studyId, payload) =>
    http(`/admin/users/${userId}/profiles/${studyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setUserRole: (userId, role) =>
    http(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (userId) => http(`/admin/users/${userId}`, { method: 'DELETE' }),
  listAssignments: (studyId) => http(`/admin/studies/${studyId}/assignments`),
  assignUserToStudy: (studyId, user_id) =>
    http(`/admin/studies/${studyId}/assignments`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  removeAssignment: (studyId, userId) =>
    http(`/admin/studies/${studyId}/assignments/${userId}`, { method: 'DELETE' }),
  listProfileCards: (studyId) => http(`/admin/studies/${studyId}/profile-cards`),
  createProfileCard: (studyId, payload) =>
    http(`/admin/studies/${studyId}/profile-cards`, { method: 'POST', body: JSON.stringify(payload) }),
  updateProfileCard: (cardId, payload) =>
    http(`/admin/profile-cards/${cardId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProfileCard: (cardId) => http(`/admin/profile-cards/${cardId}`, { method: 'DELETE' }),
  listQuestions: (studyId) => http(`/admin/studies/${studyId}/questions`),
  createQuestion: (studyId, payload) =>
    http(`/admin/studies/${studyId}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (questionId, payload) =>
    http(`/admin/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuestion: (questionId) => http(`/admin/questions/${questionId}`, { method: 'DELETE' }),
  listCards: (studyId) => http(`/admin/studies/${studyId}/cards`),
  createCard: (studyId, payload) =>
    http(`/admin/studies/${studyId}/cards`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCard: (cardId, payload) =>
    http(`/admin/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCard: (cardId) => http(`/admin/cards/${cardId}`, { method: 'DELETE' }),
  listTasks: (studyId) => http(`/admin/studies/${studyId}/tasks`),
  createTask: (studyId, payload) =>
    http(`/admin/studies/${studyId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (taskId, payload) =>
    http(`/admin/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (taskId) => http(`/admin/tasks/${taskId}`, { method: 'DELETE' }),
};
