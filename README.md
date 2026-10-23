# MiniLedger

**MiniLedger** is a full-stack mobile and web application for tracking money lent to friends in Indian Rupees (INR). Built as a TypeScript monorepo (`backend/` + `mobile/`), it provides phone-based OTP authentication, a real-time summary dashboard (outstanding, overdue, total lent, and total repaid), status filtering (`all`, `open`, `overdue`, `repaid`), one-tap repayment tracking, and receipt photo attachments via camera or photo library.

All monetary values are stored and transmitted as integer paise (`amountMinor`, where `₹1.00 = 100` paise) to eliminate floating-point rounding bugs.

---

## Screenshots

> _Replace the placeholders below with actual screenshots from your device or simulator:_

| Login & OTP Verification | Ledger & Summary Card | Add Loan Entry | Loan Detail & Receipt |
| :---: | :---: | :---: | :---: |
| `docs/screenshots/login.png` | `docs/screenshots/ledger.png` | `docs/screenshots/add-loan.png` | `docs/screenshots/detail.png` |

---

## Prerequisites

- **Node.js 20+** (`node -v`) and **npm 10+**
- **Docker Desktop** (with `docker compose` for PostgreSQL 16 locally) or **Neon Postgres** (cloud)
- **Expo Go** installed on a physical iOS/Android device, **Android Studio Emulator** / **Xcode iOS Simulator**, or any modern desktop/mobile web browser

---

## Step-by-Step Setup

### 1. Start PostgreSQL 16 via Docker Compose

From the repository root (`miniledger/`):

```bash
docker compose up -d
```

Verify the container is healthy:

```bash
docker compose ps
```

### 2. Configure and Set Up the Backend

```bash
cd backend
cp .env.example .env
npm install
```

Check `backend/.env` (defaults work out of the box with `docker-compose.yml`):

```env
DATABASE_URL="postgresql://miniledger:miniledger@localhost:5432/miniledger?schema=public"
JWT_SECRET="replace-with-a-secret-at-least-16-chars"
PORT=4000
UPLOAD_DIR=uploads
NODE_ENV=development
CORS_ORIGINS="http://localhost:8081,http://localhost:19006,http://localhost:3000"
DEMO_MODE=false
DEMO_PHONE="+919999999999"
DEMO_OTP="123456"
```

Run Prisma migrations and seed the demo account:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the development server (with hot reload on port `4000`):

```bash
npm run dev
```

Or build and run the compiled production bundle from `dist/`:

```bash
npm run build
npm start
```

Verify the health endpoint:

```bash
curl http://localhost:4000/api/v1/health
# {"status":"ok","db":"up"}
```

### 3. Run Backend Integration Tests

Create the isolated test database (`miniledger_test`) inside the running Postgres container and configure `backend/.env.test`:

```bash
docker compose exec postgres createdb -U miniledger miniledger_test
```

Ensure `backend/.env.test` exists with:

```env
DATABASE_URL="postgresql://miniledger:miniledger@localhost:5432/miniledger_test?schema=public"
JWT_SECRET="test-jwt-secret-at-least-16-characters"
PORT=4001
UPLOAD_DIR=uploads-test
NODE_ENV=test
```

Run the Vitest + Supertest integration suite:

```bash
cd backend
npm test
```

### 4. Configure and Run the Mobile & Web App

Open a new terminal in `mobile/`:

```bash
cd mobile
cp .env.example .env
npm install
```

Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL` based on how you are running the app:

| Target Environment | `EXPO_PUBLIC_API_URL` |
| :--- | :--- |
| **Web (Local Browser)** | `http://localhost:4000/api/v1` |
| **Android Emulator** | `http://10.0.2.2:4000/api/v1` |
| **iOS Simulator** | `http://localhost:4000/api/v1` |
| **Physical Device (Expo Go on Wi-Fi)** | `http://<YOUR_COMPUTER_LAN_IP>:4000/api/v1` (e.g. `http://192.168.1.42:4000/api/v1`) |

Start the Expo development server:

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS), press `a` for Android Emulator / `i` for iOS Simulator, or run `npm run web` to open in your desktop browser.

---

## Deploying

MiniLedger is configured for zero-cost cloud deployment using **Neon** (serverless PostgreSQL), **Render** (free Node.js web service via `render.yaml`), and **Vercel** (static Expo Web SPA via `mobile/vercel.json`).

### 1. Neon (PostgreSQL Database)

1. Sign in to [Neon](https://neon.tech) and create a new PostgreSQL 16 project (e.g. `miniledger`, region Singapore `ap-southeast-1`).
2. Copy the **pooled** connection string and ensure `?sslmode=require` is appended:
   ```text
   postgresql://USER:PASSWORD@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. From your laptop, run migrations and seed the demo account (`+919999999999`) against Neon once:
   ```bash
   cd backend
   DATABASE_URL="postgresql://USER:PASSWORD@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npx prisma migrate deploy
   DATABASE_URL="postgresql://USER:PASSWORD@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npx tsx prisma/seed.ts
   ```

### 2. Render (Backend API)

1. Push this monorepo to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New** $\rightarrow$ **Blueprint** and connect your GitHub repository. Render automatically detects `render.yaml` at the repo root (`miniledger-api`, `rootDir: backend`, `plan: free`, `region: singapore`).
3. When prompted for unsynced environment variables:
   - `DATABASE_URL`: Paste your Neon pooled connection string (`?sslmode=require`).
   - `CORS_ORIGINS`: Enter a temporary placeholder URL such as `https://placeholder.vercel.app` (you will update this in Step 4 once Vercel assigns your domain).
   - `JWT_SECRET` is generated automatically (`generateValue: true`), and `DEMO_MODE=true`, `DEMO_PHONE=+919999999999`, `DEMO_OTP=123456`, `UPLOAD_DIR=uploads` are pre-populated from `render.yaml`.
4. Click **Apply** and wait for the build (`npm install --include=dev && npm run build`) and start command (`npm run start:prod`) to finish.
5. Verify the live health endpoint:
   ```bash
   curl -i https://<your-service>.onrender.com/api/v1/health
   # HTTP/2 200
   # {"status":"ok","db":"up"}
   ```

### 3. Vercel (Expo Web App)

1. In the [Vercel Dashboard](https://vercel.com/new), import the same GitHub repository.
2. Set **Root Directory** to `mobile`. Vercel reads `mobile/vercel.json` (`buildCommand: "npx expo export --platform web"`, `outputDirectory: "dist"`, SPA rewrites, and cache headers).
3. Add the following **Environment Variables** (baked into the web bundle at build time):
   - `EXPO_PUBLIC_API_URL` = `https://<your-service>.onrender.com/api/v1` (no trailing slash)
   - `EXPO_PUBLIC_DEMO_MODE` = `true`
4. Click **Deploy** and copy your live Vercel URL (e.g. `https://miniledger.vercel.app`).

### 4. Lock Down CORS on Render

1. Return to your `miniledger-api` service in Render $\rightarrow$ **Environment**.
2. Update `CORS_ORIGINS` to your exact Vercel origin (no trailing slash; comma-separate multiple domains if you also attach a custom domain):
   ```text
   https://miniledger.vercel.app
   ```
3. Save changes so Render redeploys with the updated allow-list.

### 5. End-to-End Live Smoke Test

1. Open `https://<project>.vercel.app` on both desktop and mobile browsers.
2. Click **Fill demo number** (`+919999999999`), click **Send OTP**, enter `123456`, and click **Verify**.
3. Confirm the 6 seeded loans and summary totals render with zero CORS errors in DevTools.
4. Create a new loan, mark a loan as repaid, upload a receipt image, and refresh a deep route to confirm SPA rewrites return `index.html` without a 404.

### Environment Variables Reference

| Location | Variable | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Backend** | `DATABASE_URL` | Yes | — | PostgreSQL connection URL (use `?sslmode=require` on Neon). |
| **Backend** | `JWT_SECRET` | Yes | — | Secret key for signing 7-day `HS256` JWTs ($\ge 16$ chars in dev/test; $\ge 32$ chars enforced in `production`). |
| **Backend** | `PORT` | No | `4000` | Port bound on `0.0.0.0` (Render sets `PORT` automatically). |
| **Backend** | `NODE_ENV` | No | `development` | `development`, `production`, or `test`. In `production`, fails fast if `JWT_SECRET < 32` chars or `CORS_ORIGINS` is empty / contains `*` or `localhost`. |
| **Backend** | `CORS_ORIGINS` | Prod | `http://localhost:8081,...` | Comma-separated allow-list of allowed frontend origins (whitespace and trailing slashes are stripped). |
| **Backend** | `UPLOAD_DIR` | No | `uploads` | Directory where receipt images are stored (relative to `backend/` or absolute path like `/var/data/uploads`). |
| **Backend** | `DEMO_MODE` | No | `false` | When `true`, `DEMO_PHONE` accepts `DEMO_OTP`, skips the 30s per-phone cooldown, and is exempt from the 5-attempt lockout. |
| **Backend** | `DEMO_PHONE` | No | `+919999999999` | E.164 phone number used for public demo login when `DEMO_MODE=true`. |
| **Backend** | `DEMO_OTP` | No | `123456` | 6-digit OTP code accepted for `DEMO_PHONE` when `DEMO_MODE=true`. |
| **Mobile / Web** | `EXPO_PUBLIC_API_URL` | Yes | `http://localhost:4000/api/v1` | Base API URL (`/api/v1`), baked into the client bundle at build time. |
| **Mobile / Web** | `EXPO_PUBLIC_DEMO_MODE` | No | `false` | When `"true"`, displays the demo login hint card and "Fill demo number" button on the Login screen. |

### Known Limitations on Free Tiers

- **Render Free-Tier Cold Starts (~30–60s)**: Free Render web services spin down after 15 minutes of inactivity. The first request after idle takes up to a minute while the container boots. The mobile/web app detects slow `/health` responses after 4 seconds and displays a dismissible *"Waking up the server (free hosting), this can take up to a minute..."* banner while polling `/health` every 3 seconds until the server is ready.
- **Ephemeral Receipt Storage on Free Render**: Receipt photos are written to local container disk (`UPLOAD_DIR=uploads`). On Render's free plan, the filesystem is ephemeral and resets on every deploy or container restart (existing loans remain in Neon Postgres, but previously uploaded receipt files may return `404` after a restart). To persist files without S3, upgrade to a paid Render plan and uncomment the `disk:` block in `render.yaml` (`mountPath: /var/data/uploads`, `UPLOAD_DIR=/var/data/uploads`).
- **Public Demo Account (`DEMO_MODE=true`)**: Anyone visiting the public demo URL can sign in as `+919999999999` with OTP `123456` and mutate the shared demo ledger. Re-run `DATABASE_URL="<neon url>" npx tsx prisma/seed.ts` at any time to reset the demo account back to its 6 clean sample loans.
- **In-Memory Rate Limiting**: `express-rate-limit` (300 requests / 15 min per IP globally on `/api/v1`, 20 requests / 15 min per IP on `/auth/request-otp` and `/auth/verify-otp`) stores counters in process memory, which resets when the Render instance restarts.

---

## How Mock & Demo Login Work

MiniLedger supports both a self-contained mock OTP flow and an optional public demo login (`DEMO_MODE=true`):

1. Enter any E.164 phone number in the app (the country code `+91` is pre-filled).
   - **Seeded demo account:** `+919999999999` (pre-populated with 6 sample loans across open, overdue, and repaid states).
2. Tap **Send OTP**.
3. **When `DEMO_MODE=true`** and the phone is `DEMO_PHONE` (`+919999999999`):
   - The backend stores `DEMO_OTP` (`123456`), logs `[DEMO] +919999999999 accepts fixed OTP`, skips the 30-second per-phone cooldown, and never locks the demo phone after 5 wrong attempts.
4. **For all other phones (or when `DEMO_MODE=false`)**:
   - Look at the **backend terminal** output for `[MOCK OTP] <phone> -> <code>`.
   - Each OTP expires after **5 minutes** (`300` seconds).
   - Requesting a new OTP for the same phone number is rate-limited to **1 request per 30 seconds** (`429 RATE_LIMITED` with `Retry-After` header).
   - Requesting a new OTP invalidates any previous unconsumed OTP for that phone.
   - An OTP is invalidated after **5 failed verification attempts**.

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

All endpoints except `/health`, `/auth/request-otp`, and `/auth/verify-otp` require `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Success | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/health` | No | `200` | Returns `{ status: "ok", db: "up" }` (`503 INTERNAL_ERROR` if DB is unreachable). |
| `POST` | `/api/v1/auth/request-otp` | No | `200` | Body: `{ phone }`. Generates a 6-digit OTP and logs `[MOCK OTP] <phone> -> <code>` (or `[DEMO]` in demo mode). |
| `POST` | `/api/v1/auth/verify-otp` | No | `200` | Body: `{ phone, otp }`. Returns `{ token, user: { id, phone } }`. |
| `GET` | `/api/v1/auth/me` | Yes | `200` | Returns `{ user: { id, phone } }` for the current JWT. |
| `POST` | `/api/v1/loans` | Yes | `201` | Body: `{ friendName, amountMinor, dueDate: "YYYY-MM-DD" }`. Returns `{ loan }`. |
| `GET` | `/api/v1/loans` | Yes | `200` | Query: `?status=all\|open\|repaid\|overdue` (default `all`). Ordered by `dueDate ASC, createdAt ASC`. Returns `{ loans }`. |
| `GET` | `/api/v1/loans/:id` | Yes | `200` | Returns `{ loan }`, or `404 NOT_FOUND` (including for other users' loans). |
| `POST` | `/api/v1/loans/:id/repay` | Yes | `200` | Marks the loan as repaid (`repaidAt = now()`). Returns `409 ALREADY_REPAID` if already repaid. |
| `GET` | `/api/v1/summary` | Yes | `200` | Returns `{ totalLentMinor, totalRepaidMinor, outstandingMinor, overdueMinor, counts: { total, open, repaid, overdue } }`. |
| `POST` | `/api/v1/loans/:id/receipt` | Yes | `200` | Multipart field `receipt` (JPEG/PNG/WebP, max 5 MB). Returns updated `{ loan }` with `hasReceipt: true`. |
| `GET` | `/api/v1/loans/:id/receipt` | Yes | `200` | Streams the stored receipt image bytes (`Cache-Control: private, max-age=3600`), or `404 NOT_FOUND`. |

### Standard Error Envelope

Every non-2xx response returns a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "amountMinor", "message": "Expected integer, received float" }
    ]
  }
}
```

Error codes: `VALIDATION_ERROR` (400), `INVALID_OTP` (401), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `ALREADY_REPAID` (409), `FILE_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500/503).

---

## `curl` Cheat-Sheet

```bash
# 1. Health check
curl -s http://localhost:4000/api/v1/health

# 2. Request an OTP (check backend console for the 6-digit code, or use 123456 when DEMO_MODE=true)
curl -s -X POST http://localhost:4000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999"}'

# 3. Verify OTP and capture JWT token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999","otp":"123456"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

# 4. Create a loan (₹2,500.00 = 250000 paise)
LOAN_ID=$(curl -s -X POST http://localhost:4000/api/v1/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"friendName":"Rahul Sharma","amountMinor":250000,"dueDate":"2026-12-31"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).loan.id')

# 5. List loans (all, open, overdue, or repaid)
curl -s "http://localhost:4000/api/v1/loans?status=all" \
  -H "Authorization: Bearer $TOKEN"

# 6. Fetch ledger summary
curl -s http://localhost:4000/api/v1/summary \
  -H "Authorization: Bearer $TOKEN"

# 7. Upload a receipt image (JPEG, PNG, or WebP <= 5 MB)
curl -s -X POST "http://localhost:4000/api/v1/loans/$LOAN_ID/receipt" \
  -H "Authorization: Bearer $TOKEN" \
  -F "receipt=@/path/to/receipt.jpg;type=image/jpeg"

# 8. Mark the loan as repaid
curl -s -X POST "http://localhost:4000/api/v1/loans/$LOAN_ID/repay" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Project Structure

```text
miniledger/
├── docker-compose.yml
├── render.yaml
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── .env.production.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── db.ts
│   │   ├── errors.ts
│   │   ├── lib/
│   │   │   └── dates.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── error.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── validate.ts
│   │   └── modules/
│   │       ├── auth/
│   │       │   ├── routes.ts
│   │       │   ├── schemas.ts
│   │       │   └── service.ts
│   │       ├── loans/
│   │       │   ├── mapper.ts
│   │       │   ├── receipts.ts
│   │       │   ├── routes.ts
│   │       │   ├── schemas.ts
│   │       │   └── service.ts
│   │       └── summary/
│   │           ├── routes.ts
│   │           ├── schemas.ts
│   │           └── service.ts
│   └── tests/
│       ├── auth.test.ts
│       ├── globalSetup.ts
│       ├── helpers.ts
│       ├── loans.test.ts
│       ├── receipts.test.ts
│       ├── setup.ts
│       └── summary.test.ts
└── mobile/
    ├── .env.example
    ├── .env.production.example
    ├── vercel.json
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── theme.ts
        ├── api/
        │   ├── auth.ts
        │   ├── client.ts
        │   ├── loans.ts
        │   ├── summary.ts
        │   └── types.ts
        ├── auth/
        │   └── AuthContext.tsx
        ├── components/
        │   ├── AuthImage.tsx
        │   ├── Avatar.tsx
        │   ├── Button.tsx
        │   ├── DateField.tsx
        │   ├── DateField.web.tsx
        │   ├── EmptyState.tsx
        │   ├── FilterChips.tsx
        │   ├── Header.tsx
        │   ├── ListHeader.tsx
        │   ├── LoanRow.tsx
        │   ├── Screen.tsx
        │   ├── ServerWakeBanner.tsx
        │   ├── StatusPill.tsx
        │   ├── SummaryCard.tsx
        │   └── TextField.tsx
        ├── hooks/
        │   ├── useLedger.ts
        │   └── useServerWake.ts
        ├── navigation/
        │   ├── RootNavigator.tsx
        │   └── types.ts
        ├── screens/
        │   ├── AddLoanScreen.tsx
        │   ├── LoanDetailScreen.tsx
        │   ├── LoansScreen.tsx
        │   └── LoginScreen.tsx
        └── utils/
            ├── dates.ts
            ├── dialog.ts
            └── money.ts
```

---

## Design Decisions

1. **Integer Paise (`amountMinor`) Everywhere**:
   All currency values are stored as 32-bit integers in paise (`100` paise = `₹1.00`, up to `1,000,000,000` paise = `₹1,00,00,000`). The mobile client parses user input into integer paise without `parseFloat` arithmetic and formats amounts with Indian digit grouping (`en-IN`).
2. **Derived Loan Status**:
   Rather than storing a mutable `status` column that can drift out of sync as dates pass, `status` is derived on read:
   - `repaidAt !== null` $\rightarrow$ `"repaid"`
   - `dueDate < todayUtc()` $\rightarrow$ `"overdue"`
   - Otherwise $\rightarrow$ `"open"`
3. **UTC Calendar-Date Boundary (`todayUtc`)**:
   `dueDate` is stored as a PostgreSQL `@db.Date` (`YYYY-MM-DD`) and compared against UTC midnight (`Date.UTC(year, month, day)`) so status derivation and database queries (`lt` / `gte`) are deterministic across environments.
4. **Local-Disk Receipts with Ownership & Magic-Byte Checks**:
   Receipts are stored under `UPLOAD_DIR/<userId>/<loanId>-<timestamp>.<ext>`. Loan ownership is verified *before* Multer writes to disk, uploaded files are sniffed for valid JPEG/PNG/WebP magic bytes, path traversal is blocked via `path.resolve` prefix validation, and replacing a receipt unlinks the previous file.
5. **7-Day Stateless JWT (`HS256`)**:
   Authentication issues a 7-day `HS256` JWT stored in `expo-secure-store` on native and `localStorage` on web. Any `401 UNAUTHORIZED` response automatically clears the stored token, transitions the app to the login screen, and alerts the user that their session expired.
