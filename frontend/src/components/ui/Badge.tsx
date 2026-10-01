import type { ReactNode } from 'react';
import type { CreditType, ReservationStatus, UserStatus } from '../../types';
import { CREDIT_TYPE_LABELS, RESERVATION_STATUS_LABELS, USER_STATUS_LABELS, signedCredits } from '../../utils/format';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

const USER_TONES: Record<UserStatus, Tone> = { PENDING: 'warning', ACTIVE: 'success', REJECTED: 'danger', DISABLED: 'neutral' };

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_TONES[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}

const RESERVATION_TONES: Record<ReservationStatus, Tone> = {
  PENDING: 'warning',
  APPROVED: 'info',
  FULFILLED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge tone={RESERVATION_TONES[status]}>{RESERVATION_STATUS_LABELS[status]}</Badge>;
}

const TYPE_TONES: Record<CreditType, Tone> = {
  QR_REWARD: 'accent',
  ADMIN_GRANT: 'info',
  ADJUSTMENT: 'neutral',
  STORE_RESERVATION: 'warning',
  STORE_REDEMPTION: 'warning',
  STORE_REFUND: 'success',
};

export function CreditTypeBadge({ type }: { type: CreditType }) {
  return <Badge tone={TYPE_TONES[type]}>{CREDIT_TYPE_LABELS[type]}</Badge>;
}

/** "+50" in green / "−250" in red. */
export function CreditAmount({ amount }: { amount: number }) {
  return <span className={`amount ${amount >= 0 ? 'amount--plus' : 'amount--minus'}`}>{signedCredits(amount)}</span>;
}
