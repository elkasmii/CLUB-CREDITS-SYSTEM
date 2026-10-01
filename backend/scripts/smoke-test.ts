/**
 * End-to-end smoke test against a RUNNING backend (npm run dev in another terminal).
 *
 *   npm run test:smoke
 *
 * Uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env to log in as admin.
 * Creates a throwaway member, QR campaign and store item (all tagged "[smoke]")
 * and deactivates the QR/item at the end.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api`;
let failures = 0;

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  return { status: res.status, body: json };
}

function check(label: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);
  const stamp = Date.now();
  const email = `smoke.${stamp}@example.com`;
  const password = 'SmokeTest123!';

  // --- Auth & approval ---
  const reg = await call('POST', '/auth/register', { fullName: 'Smoke Tester', email, password, studentId: `S${stamp}` });
  check('register -> 201 PENDING', reg.status === 201 && reg.body.user?.status === 'PENDING', reg.body);
  const memberId: number = reg.body.user?.id;

  const dup = await call('POST', '/auth/register', { fullName: 'Dup', email, password });
  check('duplicate email -> 409', dup.status === 409, dup.body);

  const pendingLogin = await call('POST', '/auth/login', { email, password });
  check('pending member cannot log in (403 ACCOUNT_PENDING)', pendingLogin.status === 403 && pendingLogin.body.error?.code === 'ACCOUNT_PENDING', pendingLogin.body);

  const badLogin = await call('POST', '/auth/login', { email, password: 'wrong-password' });
  check('wrong password -> 401', badLogin.status === 401, badLogin.body);

  const adminLogin = await call('POST', '/auth/login', {
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  check('admin login', adminLogin.status === 200 && adminLogin.body.user?.role === 'ADMIN', adminLogin.body);
  const adminToken: string = adminLogin.body.token;

  const noAuth = await call('GET', '/admin/members');
  check('admin route without token -> 401', noAuth.status === 401);

  const approve = await call('PATCH', `/admin/members/${memberId}/status`, { action: 'approve' }, adminToken);
  check('admin approves member -> ACTIVE', approve.status === 200 && approve.body.member?.status === 'ACTIVE', approve.body);

  const login = await call('POST', '/auth/login', { email, password });
  check('active member logs in', login.status === 200 && !!login.body.token, login.body);
  const memberToken: string = login.body.token;

  const forbidden = await call('GET', '/admin/stats', undefined, memberToken);
  check('member cannot access admin routes -> 403', forbidden.status === 403, forbidden.body);

  const search = await call('GET', `/admin/members?search=${encodeURIComponent(email)}`, undefined, adminToken);
  check('admin search finds member', search.body.members?.length === 1, search.body);

  // --- Credits ---
  const grant = await call('POST', '/admin/credits/grant', { memberId, amount: 100, reason: '[smoke] Helped organize' }, adminToken);
  check('admin grants 100 credits', grant.status === 201 && grant.body.newBalance === 100, grant.body);

  const badGrant = await call('POST', '/admin/credits/grant', { memberId, amount: 1.5, reason: 'bad' }, adminToken);
  check('non-integer grant rejected -> 400', badGrant.status === 400, badGrant.body);

  const overDeduct = await call('POST', '/admin/credits/grant', { memberId, amount: -500, reason: '[smoke] too much' }, adminToken);
  check('deduction below zero rejected (INSUFFICIENT_CREDITS)', overDeduct.body.error?.code === 'INSUFFICIENT_CREDITS', overDeduct.body);

  // --- QR ---
  const qr = await call('POST', '/admin/qr-campaigns', { title: '[smoke] Cybersecurity Conference', credits: 50, isActive: true }, adminToken);
  check('admin creates QR campaign', qr.status === 201 && typeof qr.body.campaign?.token === 'string', qr.body);
  const qrToken: string = qr.body.campaign?.token;
  check('QR token is long & random (43 chars, no credit value)', qrToken?.length === 43 && !qrToken.includes('50'), qrToken);

  const redeem1 = await call('POST', '/qr/redeem', { token: qrToken }, memberToken);
  check('redeem QR -> +50, balance 150', redeem1.status === 200 && redeem1.body.credits === 50 && redeem1.body.newBalance === 150, redeem1.body);

  const redeem2 = await call('POST', '/qr/redeem', { token: qrToken }, memberToken);
  check('redeem SAME QR again -> 409 QR_ALREADY_USED', redeem2.status === 409 && redeem2.body.error?.code === 'QR_ALREADY_USED', redeem2.body);

  // Race: fire 5 redemptions of a new QR at once — exactly one must succeed.
  const qrRace = await call('POST', '/admin/qr-campaigns', { title: '[smoke] Race QR', credits: 10, isActive: true }, adminToken);
  const race = await Promise.all(
    Array.from({ length: 5 }, () => call('POST', '/qr/redeem', { token: qrRace.body.campaign.token }, memberToken)),
  );
  check('5 parallel redemptions -> exactly 1 success', race.filter((r) => r.status === 200).length === 1, race.map((r) => r.status));

  const invalid = await call('POST', '/qr/redeem', { token: 'definitely-not-a-real-token-1234567890abc' }, memberToken);
  check('random token -> 404 INVALID_QR', invalid.body.error?.code === 'INVALID_QR', invalid.body);

  const garbage = await call('POST', '/qr/redeem', { token: 'https://example.com' }, memberToken);
  check('non-token QR content -> INVALID_QR', garbage.body.error?.code === 'INVALID_QR', garbage.body);

  await call('PATCH', `/admin/qr-campaigns/${qrRace.body.campaign.id}`, { isActive: false }, adminToken);
  const qrInactive = await call('POST', '/admin/qr-campaigns', { title: '[smoke] Inactive', credits: 5, isActive: false }, adminToken);
  const inactive = await call('POST', '/qr/redeem', { token: qrInactive.body.campaign.token }, memberToken);
  check('inactive QR -> QR_INACTIVE', inactive.body.error?.code === 'QR_INACTIVE', inactive.body);

  const pastExpiry = await call('POST', '/admin/qr-campaigns', { title: 'x', credits: 5, expiresAt: '2000-01-01T00:00:00Z' }, adminToken);
  check('cannot create QR expiring in the past -> 400', pastExpiry.status === 400, pastExpiry.body);

  // Make an expired QR by creating it then moving its expiry into the past via PATCH.
  const qrExp = await call('POST', '/admin/qr-campaigns', { title: '[smoke] Expired', credits: 5 }, adminToken);
  await call('PATCH', `/admin/qr-campaigns/${qrExp.body.campaign.id}`, { expiresAt: '2000-01-01T00:00:00Z' }, adminToken);
  const expired = await call('POST', '/qr/redeem', { token: qrExp.body.campaign.token }, memberToken);
  check('expired QR -> 410 QR_EXPIRED', expired.status === 410 && expired.body.error?.code === 'QR_EXPIRED', expired.body);

  const regen = await call('PATCH', `/admin/qr-campaigns/${qr.body.campaign.id}`, { regenerateToken: true }, adminToken);
  const oldToken = await call('POST', '/qr/redeem', { token: qrToken }, memberToken);
  check('regenerated token invalidates the old QR', regen.body.campaign.token !== qrToken && oldToken.body.error?.code === 'INVALID_QR', oldToken.body);

  const adminRedeem = await call('POST', '/qr/redeem', { token: qr.body.campaign.token }, adminToken);
  check('admin account cannot redeem -> 403', adminRedeem.status === 403, adminRedeem.body);

  // Balance now 160 (100 + 50 + 10)
  // --- Store ---
  const item = await call('POST', '/admin/store', { name: '[smoke] CSC T-Shirt', priceInCredits: 120, stock: 5, isActive: true }, adminToken);
  check('admin creates store item', item.status === 201 && item.body.item?.priceInCredits === 120, item.body);
  const itemId: number = item.body.item?.id;

  const reserve1 = await call('POST', `/store/${itemId}/reserve`, {}, memberToken);
  check('reserve affordable item -> balance 40', reserve1.status === 201 && reserve1.body.newBalance === 40, reserve1.body);

  const reserve2 = await call('POST', `/store/${itemId}/reserve`, {}, memberToken);
  check('reserve without enough credits -> INSUFFICIENT_CREDITS', reserve2.status === 400 && reserve2.body.error?.code === 'INSUFFICIENT_CREDITS', reserve2.body);

  const priceTamper = await call('POST', `/store/${itemId}/reserve`, { priceInCredits: 1 }, memberToken);
  check('client-sent price is ignored', priceTamper.body.error?.code === 'INSUFFICIENT_CREDITS', priceTamper.body);

  // Race: balance 40+200 = 240 -> can afford exactly 2 items at 120. Fire 6 at once.
  await call('POST', '/admin/credits/grant', { memberId, amount: 200, reason: '[smoke] race funds' }, adminToken);
  const reserveRace = await Promise.all(Array.from({ length: 6 }, () => call('POST', `/store/${itemId}/reserve`, {}, memberToken)));
  check('6 parallel reservations with credits for 2 -> exactly 2 succeed', reserveRace.filter((r) => r.status === 201).length === 2, reserveRace.map((r) => r.status));

  const afterRace = await call('GET', '/members/me/credits', undefined, memberToken);
  check('balance never negative, ledger == balance', afterRace.body.balance === 0 && afterRace.body.ledgerBalance === afterRace.body.balance, afterRace.body);

  const itemsAdmin = await call('GET', '/admin/store', undefined, adminToken);
  const stockNow = itemsAdmin.body.items?.find((i: any) => i.id === itemId)?.stock;
  check('stock decremented to 2 (5 - 3 reservations)', stockNow === 2, stockNow);

  // --- Reservation management ---
  const resList = await call('GET', '/admin/reservations?status=PENDING', undefined, adminToken);
  const mine = resList.body.reservations?.filter((r: any) => r.member.id === memberId) ?? [];
  check('admin sees the 3 pending reservations', mine.length === 3, mine.length);

  const reject = await call('PATCH', `/admin/reservations/${mine[0]?.id}`, { status: 'REJECTED', note: '[smoke]' }, adminToken);
  check('admin rejects reservation', reject.status === 200 && reject.body.reservation?.status === 'REJECTED', reject.body);
  const rejectAgain = await call('PATCH', `/admin/reservations/${mine[0]?.id}`, { status: 'REJECTED' }, adminToken);
  check('cannot reject twice (no double refund)', rejectAgain.status === 400, rejectAgain.body);

  const approveRes = await call('PATCH', `/admin/reservations/${mine[1]?.id}`, { status: 'APPROVED' }, adminToken);
  const fulfil = await call('PATCH', `/admin/reservations/${mine[1]?.id}`, { status: 'FULFILLED' }, adminToken);
  check('approve -> fulfil', approveRes.status === 200 && fulfil.body.reservation?.status === 'FULFILLED', fulfil.body);

  const cancel = await call('POST', `/members/me/reservations/${mine[2]?.id}/cancel`, {}, memberToken);
  check('member cancels own pending reservation -> refund', cancel.status === 200 && cancel.body.newBalance === 240, cancel.body);

  const history = await call('GET', '/members/me/transactions', undefined, memberToken);
  const types = new Set((history.body.transactions ?? []).map((t: any) => t.type));
  check(
    'history contains ADMIN_GRANT, QR_REWARD, STORE_RESERVATION, STORE_REFUND',
    ['ADMIN_GRANT', 'QR_REWARD', 'STORE_RESERVATION', 'STORE_REFUND'].every((t) => types.has(t)),
    [...types],
  );

  const detail = await call('GET', `/admin/members/${memberId}`, undefined, adminToken);
  check('admin member profile includes history', detail.body.transactions?.length === history.body.transactions?.length, detail.body.transactions?.length);

  const stats = await call('GET', '/admin/stats', undefined, adminToken);
  check('admin stats endpoint', stats.status === 200 && typeof stats.body.totalCreditsDistributed === 'number', stats.body);

  // --- Disable ---
  await call('PATCH', `/admin/members/${memberId}/status`, { action: 'disable' }, adminToken);
  const disabledUse = await call('GET', '/members/me/credits', undefined, memberToken);
  check('disabled member token stops working immediately -> 403', disabledUse.status === 403, disabledUse.body);

  // Cleanup: hide smoke artifacts
  for (const id of [qr.body.campaign?.id, qrInactive.body.campaign?.id, qrExp.body.campaign?.id]) {
    if (id) await call('PATCH', `/admin/qr-campaigns/${id}`, { isActive: false }, adminToken);
  }
  if (itemId) await call('PATCH', `/admin/store/${itemId}`, { isActive: false }, adminToken);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
