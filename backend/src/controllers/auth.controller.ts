import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as authService from '../services/auth.service';
import * as passwordService from '../services/password.service';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await authService.createMember(input, 'PENDING');
  res.status(201).json({
    user,
    message: 'Registration received! An administrator will review your request soon.',
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  res.json(await authService.login(email, password));
}

export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getProfile(currentUser(req).id) });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  await passwordService.requestPasswordReset(email);
  // Same answer whether or not the account exists.
  res.json({ message: 'If an active account uses this email, a reset link is on its way.' });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await passwordService.resetPassword(token, password);
  res.json({ message: 'Your password has been changed. You can now log in.' });
}
