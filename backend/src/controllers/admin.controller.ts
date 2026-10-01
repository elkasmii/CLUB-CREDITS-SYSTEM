import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as authService from '../services/auth.service';
import * as creditService from '../services/credit.service';
import * as memberService from '../services/member.service';
import * as passwordService from '../services/password.service';
import * as statsService from '../services/stats.service';
import * as storeService from '../services/store.service';
import {
  createMemberSchema,
  grantCreditsSchema,
  listMembersQuery,
  listReservationsQuery,
  memberStatusSchema,
  setPasswordSchema,
  updateReservationSchema,
} from '../validators/admin.validators';
import { idParam } from '../validators/common';

export async function stats(_req: Request, res: Response) {
  res.json(await statsService.getDashboardStats());
}

// ----- Members -----

export async function listMembers(req: Request, res: Response) {
  const filters = listMembersQuery.parse(req.query);
  res.json({ members: await memberService.listMembers(filters) });
}

export async function getMember(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  res.json(await memberService.getMemberDetail(id));
}

export async function createMember(req: Request, res: Response) {
  const input = createMemberSchema.parse(req.body);
  res.status(201).json({ member: await authService.createMember(input, 'ACTIVE') });
}

export async function changeMemberStatus(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const { action } = memberStatusSchema.parse(req.body);
  res.json({ member: await memberService.changeMemberStatus(id, action) });
}

// ----- Credits -----

export async function grantCredits(req: Request, res: Response) {
  const { memberId, amount, reason } = grantCreditsSchema.parse(req.body);
  const result = await creditService.grantCredits(currentUser(req).id, memberId, amount, reason);
  res.status(201).json({ transaction: result.transaction, newBalance: result.balance });
}

export async function recentGrants(_req: Request, res: Response) {
  res.json({ transactions: await creditService.recentGrants(15) });
}

// ----- Reservations -----

export async function listReservations(req: Request, res: Response) {
  const { status } = listReservationsQuery.parse(req.query);
  res.json({ reservations: await storeService.listAllReservations(status) });
}

export async function updateReservation(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const { status, note } = updateReservationSchema.parse(req.body);
  res.json({ reservation: await storeService.adminUpdateReservation(currentUser(req).id, id, status, note) });
}

export async function setMemberPassword(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const { password } = setPasswordSchema.parse(req.body);
  await passwordService.adminSetPassword(id, password);
  res.json({ message: 'Password updated. The member has been logged out of all devices.' });
}
