import type { Prisma } from '@prisma/client';

/** User fields that are safe to send to the frontend (never the password hash). */
export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  studentId: true,
  program: true,
  yearOfStudy: true,
  phone: true,
  creditBalance: true,
  approvedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
