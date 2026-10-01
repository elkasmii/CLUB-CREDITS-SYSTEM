import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../utils/jwt';
import { forbidden, unauthorized } from '../utils/httpError';

export interface AuthUser {
  id: number;
  role: Role;
  fullName: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies the JWT and re-loads the user from the database on every request,
 * so disabling an account or changing a role takes effect immediately
 * (not only when the token expires).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw unauthorized();

  const payload = verifyToken(token);
  if (!payload) throw unauthorized('Your session has expired. Please log in again.', 'INVALID_TOKEN');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, fullName: true, email: true, status: true, passwordChangedAt: true },
  });
  if (!user) throw unauthorized('Account not found.', 'INVALID_TOKEN');
  // Password changed after this token was issued -> every old session must log in again.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw unauthorized('Your password was changed. Please log in again.', 'INVALID_TOKEN');
  }
  if (user.status !== 'ACTIVE') throw forbidden('Your account is not active.', 'ACCOUNT_NOT_ACTIVE');

  req.user = { id: user.id, role: user.role, fullName: user.fullName, email: user.email };
  next();
}

/** Use after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

/** Convenience for controllers behind `authenticate`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
