import { http } from './http';

export const adminApi = {
  listUsers: () => http('/admin/users'),
  listUserProfiles: (userId) => http(`/admin/users/${userId}/profiles`),
  updateUserProfile: (userId, studyId, payload) =>
    http(`/admin/users/${userId}/profiles/${studyId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setUserRole: (userId, role) =>
    http(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  listPasswordResetRequests: () => http('/admin/users/password-reset-requests'),
  decidePasswordResetRequest: (userId, decision) =>
    http(`/admin/users/${userId}/password-reset-decision`, { method: 'POST', body: JSON.stringify({ decision }) }),
  deleteUser: (userId) => http(`/admin/users/${userId}`, { method: 'DELETE' }),
  listAssignments: (studyId) => http(`/admin/studies/${studyId}/assignments`),
  assignUserToStudy: (studyId, user_id) =>
    http(`/admin/studies/${studyId}/assignments`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  assignStudyToAllUsers: (studyId) => http(`/admin/studies/${studyId}/assignments/assign-all`, { method: 'POST' }),
  disableAssignStudyToAllUsers: (studyId) =>
    http(`/admin/studies/${studyId}/assignments/assign-all`, { method: 'DELETE' }),
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
  listCardSortColumns: (studyId) => http(`/admin/studies/${studyId}/card-sort-columns`),
  createCardSortColumn: (studyId, payload) =>
    http(`/admin/studies/${studyId}/card-sort-columns`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCardSortColumn: (columnId, payload) =>
    http(`/admin/card-sort-columns/${columnId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCardSortColumn: (columnId) => http(`/admin/card-sort-columns/${columnId}`, { method: 'DELETE' }),
  listTasks: (studyId) => http(`/admin/studies/${studyId}/tasks`),
  createTask: (studyId, payload) =>
    http(`/admin/studies/${studyId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  uploadTaskAttachment: (taskId, files) => {
    const formData = new FormData();
    for (const file of files || []) {
      formData.append('files', file);
    }
    return http(`/admin/tasks/${taskId}/attachment`, { method: 'POST', body: formData });
  },
  deleteTaskAttachment: (taskId, path) =>
    http(`/admin/tasks/${taskId}/attachment`, {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    }),
  updateTask: (taskId, payload) =>
    http(`/admin/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (taskId) => http(`/admin/tasks/${taskId}`, { method: 'DELETE' }),
};
