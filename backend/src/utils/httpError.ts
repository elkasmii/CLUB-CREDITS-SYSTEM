/**
 * An error with an HTTP status and a stable machine-readable `code`.
 * Throw it from services/controllers; the error middleware turns it into JSON:
 *   { "error": { "code": "QR_EXPIRED", "message": "This QR code has expired." } }
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') => new HttpError(400, code, message);
export const unauthorized = (message = 'Please log in.', code = 'UNAUTHORIZED') => new HttpError(401, code, message);
export const forbidden = (message = 'You are not allowed to do this.', code = 'FORBIDDEN') =>
  new HttpError(403, code, message);
export const notFound = (message = 'Not found.', code = 'NOT_FOUND') => new HttpError(404, code, message);
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, code, message);
