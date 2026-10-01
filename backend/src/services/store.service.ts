import type { ReservationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, HttpError, notFound } from '../utils/httpError';
import { removeUploadedFile } from '../middleware/upload';
import { applyCredit } from './credit.service';

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

interface ItemInput {
  name: string;
  description: string | null;
  priceInCredits: number;
  stock: number;
  isActive: boolean;
}

export function listItems(opts: { activeOnly: boolean }) {
  return prisma.storeItem.findMany({
    where: opts.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isActive: 'desc' }, { priceInCredits: 'asc' }],
    include: opts.activeOnly ? undefined : { _count: { select: { reservations: true } } },
  });
}

export async function getItem(id: number, opts: { activeOnly: boolean }) {
  const item = await prisma.storeItem.findUnique({ where: { id } });
  if (!item || (opts.activeOnly && !item.isActive)) throw notFound('Store item not found.');
  return item;
}

export function createItem(input: ItemInput, imageUrl: string | null) {
  return prisma.storeItem.create({ data: { ...input, imageUrl } });
}

export async function updateItem(
  id: number,
  input: Partial<ItemInput> & { removeImage?: boolean },
  newImageUrl: string | null,
) {
  const item = await prisma.storeItem.findUnique({ where: { id } });
  if (!item) {
    removeUploadedFile(newImageUrl);
    throw notFound('Store item not found.');
  }
  const { removeImage, ...data } = input;
  const imageUrl = newImageUrl ?? (removeImage ? null : item.imageUrl);
  const updated = await prisma.storeItem.update({ where: { id }, data: { ...data, imageUrl } });
  if (imageUrl !== item.imageUrl) removeUploadedFile(item.imageUrl);
  return updated;
}

/** Items with reservation history are deactivated instead of deleted (history is preserved). */
export async function deleteItem(id: number) {
  const item = await prisma.storeItem.findUnique({ where: { id }, include: { _count: { select: { reservations: true } } } });
  if (!item) throw notFound('Store item not found.');

  if (item._count.reservations > 0) {
    await prisma.storeItem.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, deactivated: true };
  }
  await prisma.storeItem.delete({ where: { id } });
  removeUploadedFile(item.imageUrl);
  return { deleted: true, deactivated: false };
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

const reservationInclude = {
  item: { select: { id: true, name: true, imageUrl: true } },
  member: { select: { id: true, fullName: true, email: true, studentId: true } },
};

/**
 * Reserve one unit of an item. Everything happens in ONE database transaction:
 *   1. stock is decremented only if stock > 0 and the item is active (atomic conditional UPDATE)
 *   2. the reservation row is created with the current price
 *   3. credits are deducted only if balance >= price (atomic conditional UPDATE in applyCredit)
 * If any step fails, all of them are rolled back — so firing many requests at once
 * cannot overspend credits or oversell stock. The price always comes from the DB.
 */
export async function reserveItem(memberId: number, itemId: number) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.storeItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) throw notFound('This item is not available.', 'ITEM_UNAVAILABLE');

    const stockUpdate = await tx.storeItem.updateMany({
      where: { id: itemId, isActive: true, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
    if (stockUpdate.count === 0) throw new HttpError(409, 'OUT_OF_STOCK', 'Sorry, this item is out of stock.');

    const reservation = await tx.reservation.create({
      data: { memberId, itemId, priceAtReservation: item.priceInCredits },
    });

    const { balance } = await applyCredit(tx, {
      memberId,
      amount: -item.priceInCredits,
      type: 'STORE_RESERVATION',
      description: `${item.name} reservation`,
      reservationId: reservation.id,
    });

    const full = await tx.reservation.findUniqueOrThrow({ where: { id: reservation.id }, include: reservationInclude });
    return { reservation: full, newBalance: balance };
  });
}

export function listMemberReservations(memberId: number) {
  return prisma.reservation.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    include: { item: { select: { id: true, name: true, imageUrl: true } } },
  });
}

export function listAllReservations(status?: ReservationStatus) {
  return prisma.reservation.findMany({
    where: { status },
    orderBy: [{ createdAt: 'desc' }],
    include: reservationInclude,
  });
}

// Allowed transitions. REJECTED / CANCELLED refund the credits and restock the item.
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['FULFILLED', 'REJECTED', 'CANCELLED'],
  FULFILLED: [],
  REJECTED: [],
  CANCELLED: [],
};

const REFUND_STATUSES: ReservationStatus[] = ['REJECTED', 'CANCELLED'];

async function transitionReservation(
  id: number,
  to: ReservationStatus,
  opts: { actorId: number; memberId?: number; note?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id }, include: { item: true } });
    if (!reservation || (opts.memberId && reservation.memberId !== opts.memberId)) {
      throw notFound('Reservation not found.');
    }
    const allowedFrom = (Object.keys(TRANSITIONS) as ReservationStatus[]).filter((s) => TRANSITIONS[s].includes(to));
    if (!allowedFrom.includes(reservation.status)) {
      throw badRequest(`A ${reservation.status} reservation cannot become ${to}.`, 'INVALID_STATUS_CHANGE');
    }

    // Conditional update so two admins clicking "Reject" at once can't refund twice.
    const changed = await tx.reservation.updateMany({
      where: { id, status: reservation.status },
      // Keep the previous note unless a new one is given.
      data: { status: to, ...(opts.note ? { adminNote: opts.note } : {}) },
    });
    if (changed.count === 0) throw new HttpError(409, 'CONFLICT', 'This reservation was just updated. Refresh and retry.');

    if (REFUND_STATUSES.includes(to)) {
      await tx.storeItem.update({ where: { id: reservation.itemId }, data: { stock: { increment: 1 } } });
      await applyCredit(tx, {
        memberId: reservation.memberId,
        amount: reservation.priceAtReservation,
        type: 'STORE_REFUND',
        description: `${reservation.item.name} reservation ${to.toLowerCase()} (refund)`,
        reservationId: reservation.id,
        createdById: opts.memberId ? null : opts.actorId,
      });
    }

    return tx.reservation.findUniqueOrThrow({ where: { id }, include: reservationInclude });
  });
}

export function adminUpdateReservation(adminId: number, id: number, status: ReservationStatus, note: string | null) {
  return transitionReservation(id, status, { actorId: adminId, note });
}

/** Members may cancel their own reservation while it is still PENDING. */
export async function memberCancelReservation(memberId: number, id: number) {
  const r = await prisma.reservation.findFirst({ where: { id, memberId }, select: { status: true } });
  if (!r) throw notFound('Reservation not found.');
  if (r.status !== 'PENDING') {
    throw badRequest('Only pending reservations can be cancelled. Contact an admin.', 'INVALID_STATUS_CHANGE');
  }
  return transitionReservation(id, 'CANCELLED', { actorId: memberId, memberId });
}
