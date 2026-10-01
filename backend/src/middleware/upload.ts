import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import multer from 'multer';
import { badRequest } from '../utils/httpError';

export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Accepts a single optional `image` field (JPG/PNG/WEBP/GIF, max 2 MB). */
export const uploadItemImage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random file name: never trust the client-supplied name.
    filename: (_req, file, cb) => cb(null, `${randomBytes(12).toString('hex')}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) cb(null, true);
    else cb(badRequest('Only JPG, PNG, WEBP or GIF images are allowed.', 'UPLOAD_ERROR'));
  },
}).single('image');

/** Deletes a previously uploaded file given its public URL (`/uploads/xyz.png`). */
export function removeUploadedFile(publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(publicUrl));
  fs.promises.unlink(filePath).catch(() => undefined);
}
