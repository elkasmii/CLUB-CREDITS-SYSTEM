import { z } from 'zod';

/** Route param like `/members/:id`. */
export const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Optional trimmed text: empty strings become `null`. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Accepts real booleans and the strings "true"/"false" (multipart forms send strings). */
export const booleanish = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

export const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(191);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.'); // bcrypt only uses the first 72 bytes
