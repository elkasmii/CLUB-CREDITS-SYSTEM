// Shapes returned by the backend API. Dates arrive as ISO strings.

export type Role = 'ADMIN' | 'MEMBER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED';
export type CreditType =
  | 'QR_REWARD'
  | 'ADMIN_GRANT'
  | 'ADJUSTMENT'
  | 'STORE_RESERVATION'
  | 'STORE_REDEMPTION'
  | 'STORE_REFUND';
export type ReservationStatus = 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  studentId: string | null;
  program: string | null;
  yearOfStudy: number | null;
  phone: string | null;
  creditBalance: number;
  approvedAt: string | null;
  createdAt: string;
}

export interface PersonRef {
  id: number;
  fullName: string;
}

export interface CreditTransaction {
  id: number;
  memberId: number;
  amount: number;
  type: CreditType;
  description: string;
  balanceAfter: number;
  createdAt: string;
  createdBy?: PersonRef | null;
  member?: PersonRef;
}

export interface CreditSummary {
  balance: number;
  ledgerBalance: number;
  totalEarned: number;
  totalSpent: number;
  transactionCount: number;
}

export interface QrCampaign {
  id: number;
  title: string;
  description: string | null;
  credits: number;
  token: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: PersonRef;
  _count: { redemptions: number };
}

export interface QrRedemption {
  id: number;
  redeemedAt: string;
  member: { id: number; fullName: string; email: string; studentId: string | null };
}

export interface QrCampaignDetail extends QrCampaign {
  redemptions: QrRedemption[];
}

export interface RedeemResult {
  credits: number;
  campaign: { id: number; title: string; description: string | null };
  newBalance: number;
  redeemedAt: string;
}

export interface StoreItem {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceInCredits: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  _count?: { reservations: number };
}

export interface Reservation {
  id: number;
  memberId: number;
  itemId: number;
  priceAtReservation: number;
  status: ReservationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  item: { id: number; name: string; imageUrl: string | null };
  member?: { id: number; fullName: string; email: string; studentId: string | null };
}

export interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  pendingRequests: number;
  qrCampaigns: number;
  activeQrCampaigns: number;
  totalCreditsDistributed: number;
  pendingReservations: number;
  recentTransactions: (CreditTransaction & { member: PersonRef })[];
  latestPending: Pick<User, 'id' | 'fullName' | 'email' | 'studentId' | 'createdAt'>[];
}

export interface MemberDetail {
  member: User;
  transactions: CreditTransaction[];
  reservations: Reservation[];
  redemptionCount: number;
}

export interface MemberDashboard {
  user: User;
  recentTransactions: CreditTransaction[];
  activeReservations: Reservation[];
  featuredItems: StoreItem[];
}

/** Registration / admin-create form payload. */
export interface MemberInput {
  fullName: string;
  email: string;
  password: string;
  studentId?: string;
  program?: string;
  yearOfStudy?: number | null;
  phone?: string;
}
