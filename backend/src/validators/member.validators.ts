import { z } from 'zod';

export const transactionsQuery = z.object({
  type: z
    .enum(['QR_REWARD', 'ADMIN_GRANT', 'ADJUSTMENT', 'STORE_RESERVATION', 'STORE_REDEMPTION', 'STORE_REFUND'])
    .optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

// Any string is accepted here; the service decides whether it's a real token,
// so a random QR code yields "Invalid QR Code" rather than a validation error.
export const redeemSchema = z.object({
  token: z.string().trim().min(1, 'No QR code was scanned.').max(500),
});
