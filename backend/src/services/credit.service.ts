import type { CreditType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../utils/httpError';

interface ApplyCreditInput {
  memberId: number;
  amount: number; // positive = earn, negative = spend
  type: CreditType;
  description: string;
  createdById?: number | null;
  reservationId?: number | null;
}

/**
 * THE only function that changes a member's balance.
 * Must be called inside `prisma.$transaction(async (tx) => ...)` so the balance
 * update and the ledger row are committed (or rolled back) together.
 *
 * Spending uses a conditional UPDATE (`... WHERE creditBalance >= cost`), which MySQL
 * executes atomically while holding a row lock. Two simultaneous reservations can
 * therefore never both succeed if the member can only afford one, and the balance
 * can never go negative.
 */
export async function applyCredit(tx: Prisma.TransactionClient, input: ApplyCreditInput) {
  const { memberId, amount } = input;
  if (!Number.isInteger(amount) || amount === 0) throw badRequest('Invalid credit amount.');

  if (amount < 0) {
    const result = await tx.user.updateMany({
      where: { id: memberId, creditBalance: { gte: -amount } },
      data: { creditBalance: { increment: amount } },
    });
    if (result.count === 0) {
      throw badRequest("You don't have enough CSC Credits for this.", 'INSUFFICIENT_CREDITS');
    }
  } else {
    await tx.user.update({ where: { id: memberId }, data: { creditBalance: { increment: amount } } });
  }

  // Inside the same transaction we hold the row lock, so this reads our own write.
  const { creditBalance } = await tx.user.findUniqueOrThrow({
    where: { id: memberId },
    select: { creditBalance: true },
  });

  const transaction = await tx.creditTransaction.create({
    data: {
      memberId,
      amount,
      type: input.type,
      description: input.description,
      balanceAfter: creditBalance,
      createdById: input.createdById ?? null,
      reservationId: input.reservationId ?? null,
    },
  });

  return { transaction, balance: creditBalance };
}

/** Admin manual grant (positive) or correction (negative). */
export async function grantCredits(adminId: number, memberId: number, amount: number, reason: string) {
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { role: true, status: true } });
  if (!member || member.role !== 'MEMBER') throw notFound('Member not found.');
  if (member.status !== 'ACTIVE') throw badRequest('Credits can only be given to active members.', 'MEMBER_NOT_ACTIVE');

  return prisma.$transaction((tx) =>
    applyCredit(tx, {
      memberId,
      amount,
      type: amount > 0 ? 'ADMIN_GRANT' : 'ADJUSTMENT',
      description: reason,
      createdById: adminId,
    }),
  );
}

export function listTransactions(memberId: number, opts: { type?: CreditType; sort?: 'newest' | 'oldest'; take?: number }) {
  return prisma.creditTransaction.findMany({
    where: { memberId, type: opts.type },
    orderBy: [{ createdAt: opts.sort === 'oldest' ? 'asc' : 'desc' }, { id: opts.sort === 'oldest' ? 'asc' : 'desc' }],
    take: opts.take,
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
}

/**
 * Balance summary. `balance` is the cached value; `ledgerBalance` is recomputed
 * from the history so anyone can verify they match.
 */
export async function getCreditSummary(memberId: number) {
  const [user, sums, earned, spent] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: memberId }, select: { creditBalance: true } }),
    prisma.creditTransaction.aggregate({ where: { memberId }, _sum: { amount: true }, _count: true }),
    prisma.creditTransaction.aggregate({ where: { memberId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.creditTransaction.aggregate({ where: { memberId, amount: { lt: 0 } }, _sum: { amount: true } }),
  ]);
  return {
    balance: user.creditBalance,
    ledgerBalance: sums._sum.amount ?? 0,
    totalEarned: earned._sum.amount ?? 0,
    totalSpent: Math.abs(spent._sum.amount ?? 0),
    transactionCount: sums._count,
  };
}

/** Latest admin grants/adjustments, for the "Give Credits" page. */
export function recentGrants(take = 10) {
  return prisma.creditTransaction.findMany({
    where: { type: { in: ['ADMIN_GRANT', 'ADJUSTMENT'] } },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      member: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
}
