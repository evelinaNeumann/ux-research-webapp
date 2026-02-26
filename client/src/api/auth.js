import { http } from './http';

export const authApi = {
  register: (payload) => http('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => http('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload) => http('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => http('/auth/logout', { method: 'POST' }),
  me: () => http('/auth/me'),
};
