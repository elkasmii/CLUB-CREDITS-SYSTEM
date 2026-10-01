import { createHash, randomBytes } from 'node:crypto';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../utils/httpError';
import { escapeHtml, sendMail } from '../utils/mailer';
import { hashPassword } from './auth.service';

const RESET_TTL_MINUTES = 60;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * "Forgot password". Always behaves the same whether or not the email exists, so
 * nobody can use this form to find out who has an account. The email is sent in the
 * background so response time doesn't reveal it either.
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, fullName: true, status: true } });
  if (!user || user.status !== 'ACTIVE') return; // pending / rejected / disabled accounts can't reset

  const token = randomBytes(32).toString('base64url'); // sent to the user, never stored
  await prisma.$transaction([
    // Only the newest link works.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const link = `${env.appUrl}/reset-password?token=${token}`;
  const name = user.fullName.split(' ')[0] ?? user.fullName;
  sendMail({
    to: email,
    subject: 'Reset your CSC Credits password',
    text:
      `Hi ${name},\n\nSomeone (hopefully you) asked to reset your CSC Credits password.\n` +
      `Open this link to choose a new one (valid for ${RESET_TTL_MINUTES} minutes):\n\n${link}\n\n` +
      `If you didn't ask for this, you can ignore this email — your password stays the same.\n\n— CSC`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2b2640">
        <h2 style="color:#7a68b3">CSC Credits</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Someone (hopefully you) asked to reset your CSC Credits password.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#7a68b3;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
            Choose a new password
          </a>
        </p>
        <p style="color:#6f6a86;font-size:13px">This link is valid for ${RESET_TTL_MINUTES} minutes and works once.
        If you didn't ask for this, ignore this email — your password stays the same.</p>
      </div>`,
  }).catch((err) => console.error('Failed to send password reset email:', err));
}

/** Completes a reset with the token from the email link. */
export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw badRequest('This reset link is invalid or has expired. Please request a new one.', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);
  // Conditional update: if two requests use the same link at once, only one succeeds.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw badRequest('This reset link has already been used.', 'INVALID_RESET_TOKEN');
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } });
  });
}

/** Admin sets a new password for a member. Logs that member out everywhere. */
export async function adminSetPassword(memberId: number, newPassword: string) {
  const member = await prisma.user.findFirst({ where: { id: memberId, role: 'MEMBER' }, select: { id: true } });
  if (!member) throw notFound('Member not found.');
  await prisma.$transaction([
    prisma.user.update({
      where: { id: memberId },
      data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: memberId } }),
  ]);
}
