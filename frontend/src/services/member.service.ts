import { api } from './api';
import type {
  CreditSummary,
  CreditTransaction,
  CreditType,
  MemberDashboard,
  RedeemResult,
  Reservation,
  StoreItem,
  User,
} from '../types';

export const memberService = {
  dashboard: () => api.get<MemberDashboard>('/members/me/dashboard').then((r) => r.data),

  profile: () => api.get<{ user: User }>('/members/me/profile').then((r) => r.data.user),

  credits: () => api.get<CreditSummary>('/members/me/credits').then((r) => r.data),

  transactions: (params: { type?: CreditType; sort?: 'newest' | 'oldest' }) =>
    api
      .get<{ transactions: CreditTransaction[] }>('/members/me/transactions', { params })
      .then((r) => r.data.transactions),

  reservations: () =>
    api.get<{ reservations: Reservation[] }>('/members/me/reservations').then((r) => r.data.reservations),

  cancelReservation: (id: number) =>
    api
      .post<{ reservation: Reservation; newBalance: number }>(`/members/me/reservations/${id}/cancel`)
      .then((r) => r.data),

  /** Sends the scanned token. The backend validates it and awards credits. */
  redeemQr: (token: string) => api.post<RedeemResult>('/qr/redeem', { token }).then((r) => r.data),

  storeItems: () => api.get<{ items: StoreItem[] }>('/store').then((r) => r.data.items),

  /** Only the item id is sent — the price always comes from the database. */
  reserve: (itemId: number) =>
    api
      .post<{ reservation: Reservation; newBalance: number }>(`/store/${itemId}/reserve`)
      .then((r) => r.data),
};
