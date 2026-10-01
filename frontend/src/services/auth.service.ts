import { api } from './api';
import type { MemberInput, User } from '../types';

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data),

  register: (input: MemberInput) =>
    api.post<{ user: User; message: string }>('/auth/register', input).then((r) => r.data),

  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }).then((r) => r.data),
};
