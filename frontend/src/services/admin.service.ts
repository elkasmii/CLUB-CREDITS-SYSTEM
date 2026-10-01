import { api } from './api';
import type {
  AdminStats,
  CreditTransaction,
  MemberDetail,
  MemberInput,
  QrCampaign,
  QrCampaignDetail,
  Reservation,
  ReservationStatus,
  StoreItem,
  User,
  UserStatus,
} from '../types';

export type MemberStatusAction = 'approve' | 'reject' | 'disable' | 'activate';

export interface QrCampaignInput {
  title: string;
  description?: string | null;
  credits: number;
  expiresAt?: string | null;
  isActive: boolean;
}

export const adminService = {
  stats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),

  // ----- Members -----
  members: (params: { search?: string; status?: UserStatus }) =>
    api.get<{ members: User[] }>('/admin/members', { params }).then((r) => r.data.members),

  member: (id: number) => api.get<MemberDetail>(`/admin/members/${id}`).then((r) => r.data),

  createMember: (input: MemberInput) =>
    api.post<{ member: User }>('/admin/members', input).then((r) => r.data.member),

  setMemberStatus: (id: number, action: MemberStatusAction) =>
    api.patch<{ member: User }>(`/admin/members/${id}/status`, { action }).then((r) => r.data.member),

  setMemberPassword: (id: number, password: string) =>
    api.put<{ message: string }>(`/admin/members/${id}/password`, { password }).then((r) => r.data),

  // ----- Credits -----
  grantCredits: (memberId: number, amount: number, reason: string) =>
    api
      .post<{ transaction: CreditTransaction; newBalance: number }>('/admin/credits/grant', { memberId, amount, reason })
      .then((r) => r.data),

  recentGrants: () =>
    api.get<{ transactions: CreditTransaction[] }>('/admin/credits/recent').then((r) => r.data.transactions),

  // ----- QR campaigns -----
  qrCampaigns: () => api.get<{ campaigns: QrCampaign[] }>('/admin/qr-campaigns').then((r) => r.data.campaigns),

  qrCampaign: (id: number) =>
    api.get<{ campaign: QrCampaignDetail }>(`/admin/qr-campaigns/${id}`).then((r) => r.data.campaign),

  createQrCampaign: (input: QrCampaignInput) =>
    api.post<{ campaign: QrCampaign }>('/admin/qr-campaigns', input).then((r) => r.data.campaign),

  updateQrCampaign: (id: number, input: Partial<QrCampaignInput> & { regenerateToken?: boolean }) =>
    api.patch<{ campaign: QrCampaign }>(`/admin/qr-campaigns/${id}`, input).then((r) => r.data.campaign),

  // ----- Store (multipart so an image can be attached) -----
  storeItems: () => api.get<{ items: StoreItem[] }>('/admin/store').then((r) => r.data.items),

  createStoreItem: (form: FormData) => api.post<{ item: StoreItem }>('/admin/store', form).then((r) => r.data.item),

  updateStoreItem: (id: number, form: FormData) =>
    api.patch<{ item: StoreItem }>(`/admin/store/${id}`, form).then((r) => r.data.item),

  deleteStoreItem: (id: number) =>
    api.delete<{ deleted: boolean; deactivated: boolean }>(`/admin/store/${id}`).then((r) => r.data),

  // ----- Reservations -----
  reservations: (status?: ReservationStatus) =>
    api
      .get<{ reservations: Reservation[] }>('/admin/reservations', { params: { status } })
      .then((r) => r.data.reservations),

  updateReservation: (id: number, status: Exclude<ReservationStatus, 'PENDING'>, note?: string) =>
    api
      .patch<{ reservation: Reservation }>(`/admin/reservations/${id}`, { status, note })
      .then((r) => r.data.reservation),
};
