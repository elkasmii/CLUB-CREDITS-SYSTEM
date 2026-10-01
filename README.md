# CSC Credits

The member platform of the **Computer Science Club (CSC)**. Members earn **CSC Credits** by scanning QR codes at club
events, follow every credit in their history, and reserve merch in the CSC Store. Admins validate accounts, create
QR credit campaigns, give credits by hand, and manage the store and reservations.

```
csc-project/
├── backend/    Express + TypeScript REST API, Prisma ORM, MySQL
└── frontend/   React + TypeScript + Vite, React Router, Axios
```

- **Admin panel** (`/admin/...`): calm faded-purple dashboard.
- **Member panel** (`/member/...`): vaporwave look, made mobile-first because members scan on their phones.

---

## 1. Getting started

### Requirements

- Node.js 20+ (tested on Node 26)
- MySQL 8

### Database

Create a database and a user (in MySQL Workbench or the `mysql` CLI, as root):

```sql
CREATE DATABASE csc_credits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'csc_user'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON csc_credits.* TO 'csc_user'@'localhost';
-- Only needed if you will change the schema with `npm run db:migrate`
-- (Prisma creates a temporary "shadow" database to compute migrations):
GRANT CREATE, ALTER, DROP, REFERENCES, INDEX ON *.* TO 'csc_user'@'localhost';
```

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET, SEED_ADMIN_*
npm run db:deploy           # creates the tables
npm run db:seed             # creates the first admin + starter store items
npm run dev                 # http://localhost:4000/api
```

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite forwards `/api` and `/uploads` to the backend, so no CORS setup is needed in development.

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `backend/.env`.

### Testing the scanner on a phone

Browsers only allow camera access on **https** or **localhost**. To use a phone on the same Wi-Fi:

```bash
cd frontend
npm run dev:https           # serves https://<your-computer-IP>:5173 with a self-signed certificate
```

Open the printed **Network** URL on the phone and accept the certificate warning.

### Password reset emails

"Forgot password?" on the login page emails a reset link that works **once** and expires after **1 hour**.
The database stores only a SHA-256 hash of the link's token. Changing a password (by reset or by an admin) logs that
account out of **every device**.

- **Development:** leave `SMTP_HOST` empty in `backend/.env`. The email (with the clickable link) is printed in the
  backend terminal instead of being sent.
- **Real emails:** fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` (see `.env.example`).
  For Gmail, create an *App password* (Google Account → Security → 2-Step Verification → App passwords) and use
  `smtp.gmail.com`, port `465`. Set `FRONTEND_URL` to the address members use, because the link points there.

Admins can also set a member's password directly: **Members → open a member → Set password**. There's a
*Generate* button for a strong random one.

### Useful scripts

| Where      | Command               | What it does                                               |
| ---------- | --------------------- | ---------------------------------------------------------- |
| backend    | `npm run dev`         | API with auto-reload                                       |
| backend    | `npm run test:smoke`  | 41 end-to-end API checks (the API must be running)         |
| backend    | `npm run db:migrate`  | Create a new migration after editing `schema.prisma`       |
| backend    | `npm run db:studio`   | Browse the database in Prisma Studio                       |
| backend    | `npm run db:reset`    | ⚠ Wipes the database, re-applies migrations, re-seeds     |
| frontend   | `npm run build`       | Type-check + production build into `frontend/dist`         |

---

## 2. How the important parts work

### Accounts

1. Someone registers at `/register` → their account is created as **PENDING**.
2. PENDING, REJECTED and DISABLED accounts **cannot log in**, and the login page explains why.
3. An admin approves the request (Members → *Pending requests*) → **ACTIVE**.
4. Admins can also create ACTIVE accounts directly, and disable or re-activate them later.

The API reloads the user from the database on **every request**, so disabling an account takes effect immediately,
even for someone who is already logged in.

### CSC Credits: a ledger, not just a number

Every change to a balance writes a `credit_transactions` row (amount, type, reason, balance after, who did it).
`users.creditBalance` is a cached total that changes **only** inside the same DB transaction as that row
(`backend/src/services/credit.service.ts → applyCredit`). `GET /api/members/me/credits` also returns
`ledgerBalance` (the sum of the history), so anyone can check the two match.

Spending runs one atomic conditional update: `UPDATE users SET creditBalance = creditBalance - X WHERE id = ? AND creditBalance >= X`.
If it updates 0 rows, the whole transaction rolls back, so a balance **cannot go negative**, even with many requests at once.

| Type                | Sign | When                                                  |
| ------------------- | ---- | ----------------------------------------------------- |
| `QR_REWARD`         | +    | Member redeemed a QR campaign                         |
| `ADMIN_GRANT`       | +    | Admin gave credits manually (with a reason)           |
| `ADJUSTMENT`        | −    | Admin correction/deduction                            |
| `STORE_RESERVATION` | −    | Credits held when reserving a store item              |
| `STORE_REFUND`      | +    | Reservation rejected/cancelled → credits returned     |
| `STORE_REDEMPTION`  | −    | Reserved for future direct "pay at the stand" sales   |

**Club credit rules** (attend +5, finish +10, attend every session of a workshop +30) are QR campaigns. The
"New QR code" form has one-click presets for each, so organisers create e.g. *"Git Workshop: Session 2, Attendance"*
(+5) and *"... Completion"* (+10).

### QR codes (one redemption per member)

- When an admin creates a campaign, the backend generates a **256-bit random token** (`crypto.randomBytes(32)`, base64url).
  The QR contains only a link with that token, like `https://<site>/member/scanner?code=<token>`, and never the credit amount.
- A member can scan it **in the app** (camera scanner), or with their **phone's camera app**: the link opens the
  site, asks them to log in if needed, then redeems.
- The backend checks: logged-in ACTIVE member → token exists → campaign active → not expired → not already redeemed.
- **`qr_redemptions` has `UNIQUE (memberId, campaignId)`.** Even if a member sends 5 requests at the same instant,
  the database accepts only one; the others' transactions (including their credits) roll back and get `QR_ALREADY_USED`.
- Admins can **regenerate** a token (the old printed QR stops working), deactivate a QR, set an expiry, open a
  full-screen **Present** mode for a projector, or download the QR as PNG.

Scanner error codes: `INVALID_QR`, `QR_EXPIRED`, `QR_INACTIVE`, `QR_ALREADY_USED`, `UNAUTHORIZED` / `FORBIDDEN`.

### Store and reservations

Reserving is one DB transaction:

1. Decrement stock only if `stock > 0` and the item is active (atomic conditional update).
2. Create the reservation with the **current price copied** (`priceAtReservation`).
3. Deduct the credits only if the balance covers it (atomic conditional update).

If any step fails, everything rolls back. The client sends only the item id; the price always comes from the DB.
The smoke test fires 6 reservations at once with credits for 2, and exactly 2 succeed.

Statuses: `PENDING → APPROVED → FULFILLED`, and `PENDING/APPROVED → REJECTED/CANCELLED` (credits refunded, stock
restored). Members can cancel their own PENDING reservations. A store item that already has reservations is
deactivated instead of deleted, so history stays intact.

---

## 3. Database

`backend/prisma/schema.prisma` (6 tables):

| Table                 | Purpose / key constraints                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `users`               | Admins **and** members (`role` enum, `status` enum). Unique `email`, unique `studentId`.  |
| `qr_campaigns`        | Title, credits, expiry, active flag, **unique random `token`**, `createdById → users`.    |
| `qr_redemptions`      | `memberId`, `campaignId`, `transactionId`. **UNIQUE (memberId, campaignId)**.             |
| `credit_transactions` | The ledger. Indexed by `(memberId, createdAt)`. Optional links to admin & reservation.    |
| `store_items`         | Name, description, image, price, stock, active flag.                                      |
| `reservations`        | Member, item, `priceAtReservation`, status, admin note.                                   |

Roles are an enum on `users`, not separate `roles`/`members` tables. With two fixed roles, more tables would only
add joins.

---

## 4. API reference

All endpoints are under `/api`. Authenticated requests send `Authorization: Bearer <token>`.
Errors look like `{ "error": { "code": "QR_EXPIRED", "message": "This QR code has expired." } }`.

**Public**

| Method | Path             | Notes                                     |
| ------ | ---------------- | ----------------------------------------- |
| POST   | `/auth/register` | Creates a PENDING member                  |
| POST   | `/auth/login`    | ACTIVE users only → `{ token, user }`     |
| GET    | `/auth/me`       | Current user (any role)                   |
| POST   | `/auth/forgot-password` | `{ email }` → emails a 1-hour reset link (same reply whether or not the email exists) |
| POST   | `/auth/reset-password`  | `{ token, password }` from the email link |

**Member** (role MEMBER, status ACTIVE)

| Method | Path                                    | Notes                                    |
| ------ | --------------------------------------- | ---------------------------------------- |
| GET    | `/members/me/dashboard`                 | Profile, recent transactions, rewards    |
| GET    | `/members/me/profile`                   |                                          |
| GET    | `/members/me/credits`                   | Balance, ledger balance, totals          |
| GET    | `/members/me/transactions?type=&sort=`  | Full history (`sort=newest\|oldest`)     |
| GET    | `/members/me/reservations`              |                                          |
| POST   | `/members/me/reservations/:id/cancel`   | Only PENDING; refunds credits            |
| POST   | `/qr/redeem`                            | `{ token }`                              |
| GET    | `/store`, `/store/:id`                  | Active items                             |
| POST   | `/store/:id/reserve`                    | No body needed                           |

**Admin** (role ADMIN)

| Method | Path                                  | Notes                                              |
| ------ | ------------------------------------- | -------------------------------------------------- |
| GET    | `/admin/stats`                        | Dashboard numbers                                  |
| GET    | `/admin/members?search=&status=`      |                                                    |
| POST   | `/admin/members`                      | Creates an ACTIVE member                           |
| GET    | `/admin/members/:id`                  | Profile + full credit history + reservations       |
| PATCH  | `/admin/members/:id/status`           | `{ action: approve\|reject\|disable\|activate }`   |
| PUT    | `/admin/members/:id/password`         | `{ password }`: set a member's password            |
| POST   | `/admin/credits/grant`                | `{ memberId, amount, reason }` (negative = deduct) |
| GET    | `/admin/credits/recent`               | Latest manual grants                               |
| GET    | `/admin/qr-campaigns`                 |                                                    |
| POST   | `/admin/qr-campaigns`                 | `{ title, description?, credits, expiresAt?, isActive }` |
| GET    | `/admin/qr-campaigns/:id`             | Includes who redeemed it                           |
| PATCH  | `/admin/qr-campaigns/:id`             | Any field, or `{ regenerateToken: true }`          |
| GET    | `/admin/store`                        | All items incl. inactive                           |
| POST   | `/admin/store`                        | `multipart/form-data`, optional `image` (≤ 2 MB)   |
| PATCH  | `/admin/store/:id`                    | `multipart/form-data`, `removeImage=true` to clear |
| DELETE | `/admin/store/:id`                    | Deactivates instead if it has reservations         |
| GET    | `/admin/reservations?status=`         |                                                    |
| PATCH  | `/admin/reservations/:id`             | `{ status, note? }`                                |

---

## 5. Security checklist

- Passwords hashed with **bcrypt** (12 rounds). Login runs bcrypt even for unknown emails (no timing leak).
- **JWT** signed with `JWT_SECRET` (startup fails if it's missing or shorter than 32 chars), 7-day expiry.
- **Role checks on the server** for every route. The React route guards are only for convenience.
- All input validated with **zod**. Unknown fields are dropped, so a member can't send `role`, `status`, `creditBalance` or a price.
- The frontend **never** changes balances. Every credit change goes through `applyCredit` in a DB transaction.
- QR tokens: 256-bit CSPRNG. Redemption is rate limited (20/min), and so is login/registration (30 per 15 min).
- `helmet` security headers, CORS limited to `FRONTEND_URL`, 100 KB JSON body limit.
- Uploads: images only (JPG/PNG/WEBP/GIF), max 2 MB, random file names, served with `nosniff`.
- Secrets live only in `backend/.env` (git-ignored).

**Known trade-off:** the JWT is stored in `localStorage`. That's simple and fine for a club app, but an XSS bug
could read it. If the app grows, move to an `httpOnly` cookie.

---

## 6. Project structure

```
backend/src/
├── index.ts / app.ts      server start-up and Express setup
├── routes/index.ts        every URL in one place (easy to read)
├── controllers/           parse input (zod) → call a service → send JSON
├── services/              business logic & DB transactions (credits, QR, store…)
├── middleware/            auth (JWT + roles), errors, uploads
├── validators/            zod schemas
├── lib/                   env config, Prisma client
└── utils/                 JWT, QR token, HttpError helpers

frontend/src/
├── pages/admin|member|auth   one file per screen
├── layouts/                  AdminLayout (sidebar), MemberLayout (navbar + phone tab bar), AuthLayout
├── components/ui/            Button, Card, Table, Modal, ConfirmDialog, Form fields, Badges, States
├── components/               Sidebar, Navbar, MemberPicker, StoreItemCard, QR form…
├── services/                 Axios API calls
├── hooks/                    useAuth, useToast, useAsync, useDebounce
├── types/  utils/            shared types, formatting, QR helpers
└── styles/                   base + components (shared) · admin.css · member.css
```

Both panels use the **same components**. Each theme only redefines CSS variables on `<body data-theme="admin|member">`,
so a `<Button>` looks clean and purple in the admin panel and neon-gradient in the member panel.
