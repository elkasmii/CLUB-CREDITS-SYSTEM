import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { conflict, forbidden, unauthorized } from '../utils/httpError';
import { publicUserSelect } from '../utils/selects';
import type { RegisterInput } from '../validators/auth.validators';

const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);

/** Throws a friendly 409 if the email / student ID belongs to someone else. */
async function assertUniqueIdentity(email: string, studentId: string | null, ignoreUserId?: number) {
  const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (byEmail && byEmail.id !== ignoreUserId) throw conflict('An account with this email already exists.', 'EMAIL_TAKEN');
  if (studentId) {
    const byStudentId = await prisma.user.findUnique({ where: { studentId }, select: { id: true } });
    if (byStudentId && byStudentId.id !== ignoreUserId) {
      throw conflict('This student ID is already registered.', 'STUDENT_ID_TAKEN');
    }
  }
}

/**
 * Creates a member with the given status.
 * - Self-registration: PENDING (an admin must approve).
 * - Admin-created: ACTIVE.
 * A previously REJECTED request with the same email is replaced, so people can re-apply.
 */
export async function createMember(input: RegisterInput, status: 'PENDING' | 'ACTIVE') {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const reusable = existing && existing.role === 'MEMBER' && existing.status === 'REJECTED' ? existing : null;
  await assertUniqueIdentity(input.email, input.studentId, reusable?.id);

  const data = {
    fullName: input.fullName,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    studentId: input.studentId,
    program: input.program,
    yearOfStudy: input.yearOfStudy ?? null,
    phone: input.phone,
    role: 'MEMBER' as const,
    status,
    approvedAt: status === 'ACTIVE' ? new Date() : null,
  };

  return reusable
    ? prisma.user.update({ where: { id: reusable.id }, data, select: publicUserSelect })
    : prisma.user.create({ data, select: publicUserSelect });
}

const STATUS_MESSAGES = {
  PENDING: 'Your account is waiting for approval by a CSC administrator.',
  REJECTED: 'Your registration request was rejected. Contact the CSC team for details.',
  DISABLED: 'Your account has been disabled. Contact the CSC team for details.',
} as const;

let dummyHash: string | undefined;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt so response time doesn't reveal whether the email exists.
  dummyHash ??= await hashPassword('csc-dummy-password');
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');

  if (user.status !== 'ACTIVE') {
    throw forbidden(STATUS_MESSAGES[user.status], `ACCOUNT_${user.status}`);
  }

  const token = signToken({ sub: user.id, role: user.role });
  const safeUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect });
  return { token, user: safeUser };
}

export function getProfile(userId: number) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect });
}
