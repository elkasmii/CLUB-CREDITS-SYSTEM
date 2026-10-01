import 'dotenv/config';
import { z } from 'zod';

// Validate environment variables once at startup so a missing secret fails fast
// instead of causing confusing errors later.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Email (optional). Without SMTP_HOST, emails are printed to the server console instead.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('CSC Credits <no-reply@csc.local>'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean),
  /** Public site address used in links inside emails (the first FRONTEND_URL). */
  appUrl: parsed.data.FRONTEND_URL.split(',')[0]!.trim().replace(/\/$/, ''),
};
