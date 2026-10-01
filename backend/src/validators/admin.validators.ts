import { z } from 'zod';
import { booleanish, optionalText, password } from './common';
import { memberProfileFields } from './auth.validators';

// ---------- Members ----------

export const listMembersQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'DISABLED']).optional(),
});

export const createMemberSchema = z.object(memberProfileFields);

export const memberStatusSchema = z.object({
  action: z.enum(['approve', 'reject', 'disable', 'activate']),
});

// ---------- Credits ----------

export const MAX_CREDITS_PER_ACTION = 10_000;

export const grantCreditsSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  // Positive = grant (ADMIN_GRANT), negative = correction (ADJUSTMENT). Never zero.
  amount: z.coerce
    .number()
    .int('Credits must be a whole number.')
    .min(-MAX_CREDITS_PER_ACTION)
    .max(MAX_CREDITS_PER_ACTION)
    .refine((n) => n !== 0, 'Amount cannot be zero.'),
  reason: z.string().trim().min(3, 'Please give a reason.').max(200),
});

// ---------- QR campaigns ----------

const qrBase = {
  title: z.string().trim().min(2, 'Title is required.').max(150),
  description: optionalText(2000),
  credits: z.coerce.number().int('Credits must be a whole number.').min(1).max(MAX_CREDITS_PER_ACTION),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: booleanish.default(true),
};

export const createQrSchema = z.object(qrBase).refine((d) => !d.expiresAt || d.expiresAt > new Date(), {
  message: 'Expiration must be in the future.',
  path: ['expiresAt'],
});

export const updateQrSchema = z
  .object({ ...qrBase, isActive: booleanish, regenerateToken: booleanish })
  .partial();

// ---------- Store ----------

const itemBase = {
  name: z.string().trim().min(2, 'Name is required.').max(120),
  description: optionalText(2000),
  priceInCredits: z.coerce.number().int().min(1, 'Price must be at least 1 credit.').max(1_000_000),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(100_000),
  isActive: booleanish.default(true),
};

export const createItemSchema = z.object(itemBase);
export const updateItemSchema = z
  .object({ ...itemBase, isActive: booleanish, removeImage: booleanish })
  .partial();

// ---------- Reservations ----------

export const RESERVATION_STATUSES = ['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED'] as const;

export const listReservationsQuery = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
});

export const updateReservationSchema = z.object({
  status: z.enum(['APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED']),
  note: optionalText(255),
});

export const setPasswordSchema = z.object({ password });
