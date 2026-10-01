import { prisma } from '../lib/prisma';

export async function getDashboardStats() {
  const [totalMembers, activeMembers, pendingRequests, qrCampaigns, activeQrCampaigns, distributed, pendingReservations, recentTransactions, latestPending] =
    await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER', status: { not: 'REJECTED' } } }),
      prisma.user.count({ where: { role: 'MEMBER', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'MEMBER', status: 'PENDING' } }),
      prisma.qrCampaign.count(),
      prisma.qrCampaign.count({ where: { isActive: true } }),
      // "Distributed" = credits actually awarded (QR + manual grants), not refunds.
      prisma.creditTransaction.aggregate({
        where: { type: { in: ['QR_REWARD', 'ADMIN_GRANT'] } },
        _sum: { amount: true },
      }),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.creditTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { member: { select: { id: true, fullName: true } } },
      }),
      prisma.user.findMany({
        where: { role: 'MEMBER', status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: { id: true, fullName: true, email: true, studentId: true, createdAt: true },
      }),
    ]);

  return {
    totalMembers,
    activeMembers,
    pendingRequests,
    qrCampaigns,
    activeQrCampaigns,
    totalCreditsDistributed: distributed._sum.amount ?? 0,
    pendingReservations,
    recentTransactions,
    latestPending,
  };
}
