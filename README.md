# CRB Garment ERP — React + SQLite

Uniform manufacturing ERP demo with a React auth shell, bilingual (English / Marathi) ERP UI, dark mode, raw-material photos, and SQLite persistence.

## Routes
| Path | What |
|------|------|
| `/` | Public customer website (no login): search, featured carousel, product grid, “Request a quote” form |
| `/product/:id` | Product detail (opens over the catalogue) with a prefilled quote form |
| `/admin` | Owners' dashboard (login below). Header bell shows unread quote requests, polled every 25s |

The public site (`client/index.html` → `client/src/site/`) and the dashboard (`client/admin/index.html` → `client/src/main.jsx`) are separate Vite entries, so the public bundle contains no dashboard code.

### Quote API
- `GET /api/public/products`, `GET /api/public/products/:id` — public, customer-safe product fields only
- `POST /api/quotes` — public; validates first name, surname, mobile, email, product; honeypot field `website`, per-field length caps, light per-IP rate limit
- `GET /api/quotes` (JWT) — newest first + `unreadCount`
- `PATCH /api/quotes/:id/read` (JWT), `POST /api/quotes/read-all` (JWT)

## Demo login
- **Username:** `admin`
- **Password:** `Threadline@123`

Password is stored as a bcrypt hash in SQLite (not plaintext).

## Stack
- **Frontend:** React 19 + Vite (login shell) + vanilla `client/public/erp.html` ERP SPA (iframe)
- **Backend:** Express + JWT auth
- **Database:** SQLite via `better-sqlite3` (`data/threadline.db`)
  - Cloud path: same relational schema maps cleanly to Postgres later (swap driver / `DATABASE_URL`; keep table names)

## Requirements
- Node.js 20+
- npm
- Native build tools for `better-sqlite3` (`build-essential` / Python on Linux)

## Run locally
```bash
npm install
npm run db:reset   # optional: recreate + seed SQLite
npm run dev
```

Open the Vite URL (normally **http://127.0.0.1:5173**). The API runs on port **4000** (proxied as `/api`).

Production-style local run:
```bash
npm run build
npm start
```
Then open **http://127.0.0.1:4000**.

## Database
On first server start, SQLite is created at `data/threadline.db` (override with `DATABASE_PATH` in `.env`).

### Tables
| Table | Purpose |
|-------|---------|
| `users` | Demo login; `phone` / `email` / `otp_enabled` reserved for OTP |
| `otp_requests` | OTP request scaffold (not wired to SMS/email yet) |
| `audit_log` | Auth audit trail |
| `suppliers` | Purchase-From companies |
| `employees` | Internal staff + vendors |
| `raw_materials` | Cloth batches (batch id, meters, rates, `image_path`) |
| `assignments` | Work orders across departments |
| `payments` | Settled amounts per employee |
| `app_meta` | Sequence counters |
| `products` | Public catalogue, seeded from the ERP item master (shirt, pant, skirt, …); customer-facing fields only |
| `quote_requests` | “Request a quote” submissions from the public site (`is_read` / `status`) |

Seed recreates demo suppliers, employees, batches, and assignments so the UI matches the original in-memory demo.

Batch photos are stored under `data/uploads/batches/` and served at `/api/uploads/batches/:file`.

Reset / re-seed:
```bash
npm run db:reset
```

## OTP next phase
`POST /api/auth/request-otp` and `POST /api/auth/verify-otp` return 501 placeholders. Connect an SMS/email provider and add expiry/rate limiting before enabling real OTP.

## Features in this branch
1. **EN / मराठी** — language toggle persists (`threadline_lang`); External / Client / Search pages translate via `tr()`
2. **Raw material images** — upload on new entry; shown in list + batch detail; file on disk + `image_path` in DB
3. **SQLite foundation** — ERP bootstrap via `GET /api/erp/bootstrap`; suppliers & batches write through the API
4. **Dark mode** — shared `threadline_dark` / `threadline_erp_dark` + `postMessage` sync between shell and iframe; hard-coded light styles overridden
5. **Purchase From** — searchable combobox + “Add company” saved to `suppliers`
6. **Public storefront redesign** — editorial fashion look (Cormorant Garamond + DM Sans, ivory/charcoal/indigo palette), 5-slide hero carousel (fade, arrows, dots, autoplay paused on hover/focus, swipe, reduced-motion aware), category chips + search, hover second-image product cards, full `/product/:id` page with size chips and sticky quote form. Photos are Unsplash-licensed WebP files in `client/public/images/` — see `IMAGE_CREDITS.md`. Footer contact details are placeholders.
7. **Measurement Ruler** — side tab fixed to the right edge (vertically centred) on the owner dashboard view. Opens a cm (mm ticks) + inch (1/8" ticks) ruler built from CSS physical units, with horizontal/vertical toggle; auto-hides exactly 20 s after opening (countdown shown, re-clicking the tab restarts the timer), × button and Esc close it. Physical accuracy depends on the screen's DPI/zoom.

## Security before deployment
Set a strong `JWT_SECRET`, use HTTPS, add rate limiting/lockout, keep the SQLite file outside any public static directory, and do not commit `.env` or uploaded media with secrets.

## Round 3 updates

- **Brand logo** — original CRB mark (`client/public/brand/logo-mark.svg`, `logo-full.svg`, PNG exports) used in the website header/footer, dashboard sidebar, login page and as the favicon / apple-touch-icon.
- **No faces** — every site photo is faceless (see `IMAGE_CREDITS.md`).
- **Notifications page** — the dashboard bell (and the sidebar "Notifications" item) opens `#notifications`. New quote requests are shown once as "New", then marked seen in the database (`seen_at`) and moved to "Earlier / Seen". API: `GET /api/quotes`, `GET /api/quotes/summary`, `POST /api/quotes/seen`, `DELETE /api/quotes/:id` (JWT required).
- **Quote storage** — `server/quotes-store.js` uses Postgres when `QUOTES_DATABASE_URL`, `DATABASE_URL` or `POSTGRES_URL` is set (e.g. Neon via the Vercel Marketplace), otherwise the bundled SQLite file. `/api/health` reports `quotesBackend`. On Vercel without Postgres, SQLite lives in `/tmp` and is per-instance / ephemeral.
- **Website** — EN / मराठी and dark-mode toggles in the header (shared with the dashboard via `threadline_lang` / `threadline_dark`), inset hero with spacing below the header, optional message field on the quote form.
- **Dashboard** — restyled to match the website (ivory / indigo / brass, serif headings), full dark-mode palette, broader Marathi coverage, sign-out button, the measurement-ruler tab is now a small arrow.
