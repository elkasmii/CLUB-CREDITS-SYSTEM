import type { CreditType, ReservationStatus, UserStatus } from '../types';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const formatCredits = (n: number) => n.toLocaleString();

export const signedCredits = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString()}`;

export const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  QR_REWARD: 'QR Reward',
  ADMIN_GRANT: 'Admin Grant',
  ADJUSTMENT: 'Adjustment',
  STORE_RESERVATION: 'Store Reservation',
  STORE_REDEMPTION: 'Store Redemption',
  STORE_REFUND: 'Store Refund',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DISABLED: 'Disabled',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  FULFILLED: 'Fulfilled',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/** Value for <input type="datetime-local"> -> ISO string (or null when empty). */
export const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null);

/** ISO string -> value for <input type="datetime-local"> in the user's timezone. */
export const isoToLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
