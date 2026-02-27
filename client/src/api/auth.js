import { http } from './http';

export const authApi = {
  register: (payload) => http('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => http('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (username) => http('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ username }) }),
  passwordResetStatus: (username) => http(`/auth/password-reset-status/${encodeURIComponent(username)}`),
  resetPasswordWithUsername: (payload) =>
    http('/auth/reset-password-with-username', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload) => http('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => http('/auth/logout', { method: 'POST' }),
  me: () => http('/auth/me'),
};
