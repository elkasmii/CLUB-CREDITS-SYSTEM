import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadItemImage } from '../middleware/upload';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import * as member from '../controllers/member.controller';
import * as qr from '../controllers/qr.controller';
import * as store from '../controllers/store.controller';

const limiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a moment and try again.' } },
  });

// Slow down password guessing / registration spam.
const authLimiter = limiter(15 * 60 * 1000, 30);
// Scanning is cheap for real users; this only stops scripted token guessing.
const redeemLimiter = limiter(60 * 1000, 20);
// Reset emails: limited so the form cannot be used to spam someone's inbox.
const resetLimiter = limiter(15 * 60 * 1000, 10);

const isMember = [authenticate, requireRole('MEMBER')];
const isAdmin = [authenticate, requireRole('ADMIN')];

export const api = Router();

api.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// ---------- Auth (public) ----------
api.post('/auth/register', authLimiter, auth.register);
api.post('/auth/login', authLimiter, auth.login);
api.post('/auth/forgot-password', resetLimiter, auth.forgotPassword);
api.post('/auth/reset-password', authLimiter, auth.resetPassword);
api.get('/auth/me', authenticate, auth.me);

// ---------- Member: "me" ----------
const me = Router();
me.use(...isMember);
me.get('/dashboard', member.dashboard);
me.get('/profile', member.profile);
me.get('/credits', member.credits);
me.get('/transactions', member.transactions);
me.get('/reservations', member.reservations);
me.post('/reservations/:id/cancel', member.cancelReservation);
api.use('/members/me', me);

// ---------- Member: QR ----------
api.post('/qr/redeem', ...isMember, redeemLimiter, qr.redeem);

// ---------- Store (members browse & reserve) ----------
api.get('/store', authenticate, store.listActive);
api.get('/store/:id', authenticate, store.getActive);
api.post('/store/:id/reserve', ...isMember, store.reserve);

// ---------- Admin ----------
const adm = Router();
adm.use(...isAdmin);

adm.get('/stats', admin.stats);

adm.get('/members', admin.listMembers);
adm.post('/members', admin.createMember);
adm.get('/members/:id', admin.getMember);
adm.patch('/members/:id/status', admin.changeMemberStatus);
adm.put('/members/:id/password', admin.setMemberPassword);

adm.post('/credits/grant', admin.grantCredits);
adm.get('/credits/recent', admin.recentGrants);

adm.get('/qr-campaigns', qr.list);
adm.post('/qr-campaigns', qr.create);
adm.get('/qr-campaigns/:id', qr.get);
adm.patch('/qr-campaigns/:id', qr.update);

adm.get('/store', store.listAll);
adm.post('/store', uploadItemImage, store.create);
adm.patch('/store/:id', uploadItemImage, store.update);
adm.delete('/store/:id', store.remove);

adm.get('/reservations', admin.listReservations);
adm.patch('/reservations/:id', admin.updateReservation);

api.use('/admin', adm);
