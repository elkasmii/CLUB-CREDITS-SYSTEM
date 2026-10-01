import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../lib/env';

export interface JwtPayload {
  sub: number;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, {
    subject: String(payload.sub),
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export interface VerifiedToken extends JwtPayload {
  /** Issued-at, in seconds since epoch. */
  iat: number;
}

/** Returns the payload, or null if the token is missing/invalid/expired. */
export function verifyToken(token: string): VerifiedToken | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) return null;
    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub)) return null;
    return { sub, role: decoded.role as Role, iat: decoded.iat ?? 0 };
  } catch {
    return null;
  }
}
