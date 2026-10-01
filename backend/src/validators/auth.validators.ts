import { z } from 'zod';
import { email, optionalText, password } from './common';

export const memberProfileFields = {
  fullName: z.string().trim().min(2, 'Full name is required.').max(120),
  email,
  password,
  studentId: optionalText(50),
  program: optionalText(120),
  yearOfStudy: z.coerce.number().int().min(1).max(10).optional().nullable(),
  phone: optionalText(30),
};

export const registerSchema = z.object(memberProfileFields);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'Invalid reset link.').max(200, 'Invalid reset link.'),
  password,
});
