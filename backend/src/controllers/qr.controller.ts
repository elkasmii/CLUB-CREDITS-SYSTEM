import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as qrService from '../services/qr.service';
import { createQrSchema, updateQrSchema } from '../validators/admin.validators';
import { idParam } from '../validators/common';
import { redeemSchema } from '../validators/member.validators';

// ----- Member -----

export async function redeem(req: Request, res: Response) {
  const { token } = redeemSchema.parse(req.body);
  res.json(await qrService.redeem(currentUser(req).id, token));
}

// ----- Admin -----

export async function list(_req: Request, res: Response) {
  res.json({ campaigns: await qrService.listCampaigns() });
}

export async function get(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  res.json({ campaign: await qrService.getCampaign(id) });
}

export async function create(req: Request, res: Response) {
  const input = createQrSchema.parse(req.body);
  res.status(201).json({ campaign: await qrService.createCampaign(currentUser(req).id, input) });
}

export async function update(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  const input = updateQrSchema.parse(req.body);
  res.json({ campaign: await qrService.updateCampaign(id, input) });
}
