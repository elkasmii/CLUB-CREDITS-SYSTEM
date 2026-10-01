import { randomBytes } from 'node:crypto';

/**
 * 32 random bytes from the OS CSPRNG = 256 bits of entropy, base64url encoded
 * (43 URL-safe characters). Impossible to guess and contains no campaign data.
 */
export function generateQrToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Shape check only — the database lookup decides whether it really exists. */
export const QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
