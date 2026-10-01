import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import { removeUploadedFile } from '../middleware/upload';
import * as storeService from '../services/store.service';
import { createItemSchema, updateItemSchema } from '../validators/admin.validators';
import { idParam } from '../validators/common';

const uploadedUrl = (req: Request) => (req.file ? `/uploads/${req.file.filename}` : null);

// ----- Member -----

export async function listActive(_req: Request, res: Response) {
  res.json({ items: await storeService.listItems({ activeOnly: true }) });
}

export async function getActive(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  res.json({ item: await storeService.getItem(id, { activeOnly: true }) });
}

export async function reserve(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  res.status(201).json(await storeService.reserveItem(currentUser(req).id, id));
}

// ----- Admin -----

export async function listAll(_req: Request, res: Response) {
  res.json({ items: await storeService.listItems({ activeOnly: false }) });
}

export async function create(req: Request, res: Response) {
  const imageUrl = uploadedUrl(req);
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    removeUploadedFile(imageUrl); // don't keep orphaned uploads
    throw parsed.error;
  }
  res.status(201).json({ item: await storeService.createItem(parsed.data, imageUrl) });
}

export async function update(req: Request, res: Response) {
  const imageUrl = uploadedUrl(req);
  const params = idParam.safeParse(req.params);
  const parsed = updateItemSchema.safeParse(req.body ?? {});
  if (!params.success || !parsed.success) {
    removeUploadedFile(imageUrl);
    throw (params.error ?? parsed.error)!;
  }
  res.json({ item: await storeService.updateItem(params.data.id, parsed.data, imageUrl) });
}

export async function remove(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  res.json(await storeService.deleteItem(id));
}
