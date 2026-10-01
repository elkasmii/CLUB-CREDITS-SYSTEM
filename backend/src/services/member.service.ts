import type { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../utils/httpError';
import { publicUserSelect } from '../utils/selects';

export function listMembers(filters: { search?: string; status?: UserStatus }) {
  const where: Prisma.UserWhereInput = { role: 'MEMBER', status: filters.status };
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { studentId: { contains: filters.search } },
    ];
  }
  return prisma.user.findMany({
    where,
    select: publicUserSelect,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getMemberDetail(id: number) {
  const member = await prisma.user.findFirst({ where: { id, role: 'MEMBER' }, select: publicUserSelect });
  if (!member) throw notFound('Member not found.');

  const [transactions, reservations, redemptionCount] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { memberId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { createdBy: { select: { id: true, fullName: true } } },
    }),
    prisma.reservation.findMany({
      where: { memberId: id },
      orderBy: { createdAt: 'desc' },
      include: { item: { select: { id: true, name: true, imageUrl: true } } },
    }),
    prisma.qrRedemption.count({ where: { memberId: id } }),
  ]);

  return { member, transactions, reservations, redemptionCount };
}

type StatusAction = 'approve' | 'reject' | 'disable' | 'activate';

// Which statuses each action may start from.
const ALLOWED: Record<StatusAction, { from: UserStatus[]; to: UserStatus }> = {
  approve: { from: ['PENDING'], to: 'ACTIVE' },
  reject: { from: ['PENDING'], to: 'REJECTED' },
  disable: { from: ['ACTIVE'], to: 'DISABLED' },
  activate: { from: ['DISABLED', 'REJECTED'], to: 'ACTIVE' },
};

export async function changeMemberStatus(id: number, action: StatusAction) {
  const member = await prisma.user.findFirst({ where: { id, role: 'MEMBER' }, select: { status: true } });
  if (!member) throw notFound('Member not found.');

  const rule = ALLOWED[action];
  if (!rule.from.includes(member.status)) {
    throw badRequest(`Cannot ${action} an account that is ${member.status}.`, 'INVALID_STATUS_CHANGE');
  }

  return prisma.user.update({
    where: { id },
    data: { status: rule.to, ...(action === 'approve' ? { approvedAt: new Date() } : {}) },
    select: publicUserSelect,
  });
}
