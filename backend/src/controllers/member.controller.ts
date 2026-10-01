import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as authService from '../services/auth.service';
import * as creditService from '../services/credit.service';
import * as storeService from '../services/store.service';
import { idParam } from '../validators/common';
import { transactionsQuery } from '../validators/member.validators';

/** Everything the member dashboard needs, in one request. */
export async function dashboard(req: Request, res: Response) {
  const { id } = currentUser(req);
  const [user, recentTransactions, reservations, items] = await Promise.all([
    authService.getProfile(id),
    creditService.listTransactions(id, { take: 5 }),
    storeService.listMemberReservations(id),
    storeService.listItems({ activeOnly: true }),
  ]);
  res.json({
    user,
    recentTransactions,
    activeReservations: reservations.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED'),
    featuredItems: items.slice(0, 4),
  });
}

export async function profile(req: Request, res: Response) {
  res.json({ user: await authService.getProfile(currentUser(req).id) });
}

export async function credits(req: Request, res: Response) {
  res.json(await creditService.getCreditSummary(currentUser(req).id));
}

export async function transactions(req: Request, res: Response) {
  const query = transactionsQuery.parse(req.query);
  res.json({ transactions: await creditService.listTransactions(currentUser(req).id, query) });
}

export async function reservations(req: Request, res: Response) {
  res.json({ reservations: await storeService.listMemberReservations(currentUser(req).id) });
}

export async function cancelReservation(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const reservation = await storeService.memberCancelReservation(currentUser(req).id, id);
  const user = await authService.getProfile(currentUser(req).id);
  res.json({ reservation, newBalance: user.creditBalance });
}
