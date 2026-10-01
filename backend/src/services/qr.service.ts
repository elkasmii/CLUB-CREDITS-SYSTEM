import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError, notFound } from '../utils/httpError';
import { generateQrToken, QR_TOKEN_PATTERN } from '../utils/qrToken';
import { applyCredit } from './credit.service';

interface QrInput {
  title: string;
  description: string | null;
  credits: number;
  expiresAt?: Date | null;
  isActive: boolean;
}

const withCounts = { _count: { select: { redemptions: true } }, createdBy: { select: { id: true, fullName: true } } };

export function createCampaign(adminId: number, input: QrInput) {
  return prisma.qrCampaign.create({
    data: { ...input, expiresAt: input.expiresAt ?? null, token: generateQrToken(), createdById: adminId },
    include: withCounts,
  });
}

export function listCampaigns() {
  return prisma.qrCampaign.findMany({ orderBy: { createdAt: 'desc' }, include: withCounts });
}

export async function getCampaign(id: number) {
  const campaign = await prisma.qrCampaign.findUnique({
    where: { id },
    include: {
      ...withCounts,
      redemptions: {
        orderBy: { redeemedAt: 'desc' },
        include: { member: { select: { id: true, fullName: true, email: true, studentId: true } } },
      },
    },
  });
  if (!campaign) throw notFound('QR campaign not found.');
  return campaign;
}

export async function updateCampaign(id: number, input: Partial<QrInput> & { regenerateToken?: boolean }) {
  const { regenerateToken, ...data } = input;
  const exists = await prisma.qrCampaign.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('QR campaign not found.');
  return prisma.qrCampaign.update({
    where: { id },
    // A new token instantly invalidates any old printed/shared copy of the QR.
    data: { ...data, ...(regenerateToken ? { token: generateQrToken() } : {}) },
    include: withCounts,
  });
}

// ---------------------------------------------------------------------------
// Redemption
// ---------------------------------------------------------------------------

const invalid = () => new HttpError(404, 'INVALID_QR', 'This is not a valid CSC QR code.');
const alreadyUsed = () => new HttpError(409, 'QR_ALREADY_USED', 'You have already redeemed this QR code.');

/**
 * Redeems a QR token for a member. The backend is the only authority:
 * every check below runs server-side, and the final guarantee against double
 * redemption is the UNIQUE (memberId, campaignId) constraint in qr_redemptions.
 */
export async function redeem(memberId: number, rawToken: string) {
  const token = rawToken.trim();
  if (!QR_TOKEN_PATTERN.test(token)) throw invalid();

  const campaign = await prisma.qrCampaign.findUnique({ where: { token } });
  if (!campaign) throw invalid();
  if (!campaign.isActive) throw new HttpError(400, 'QR_INACTIVE', 'This QR code is not active right now.');
  if (campaign.expiresAt && campaign.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(410, 'QR_EXPIRED', 'This QR code has expired.');
  }

  // Fast path for the common "scanned twice" case (gives a clean error without a DB exception).
  const previous = await prisma.qrRedemption.findUnique({
    where: { memberId_campaignId: { memberId, campaignId: campaign.id } },
    select: { id: true },
  });
  if (previous) throw alreadyUsed();

  try {
    return await prisma.$transaction(async (tx) => {
      const { transaction, balance } = await applyCredit(tx, {
        memberId,
        amount: campaign.credits,
        type: 'QR_REWARD',
        description: campaign.title,
      });
      // If two requests race past the fast-path check, this insert fails for the
      // second one (P2002) and its whole transaction — including the credits — is rolled back.
      await tx.qrRedemption.create({ data: { memberId, campaignId: campaign.id, transactionId: transaction.id } });

      return {
        credits: campaign.credits,
        campaign: { id: campaign.id, title: campaign.title, description: campaign.description },
        newBalance: balance,
        redeemedAt: transaction.createdAt,
      };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw alreadyUsed();
    throw err;
  }
}
