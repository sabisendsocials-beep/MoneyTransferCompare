# SabiSend — Codex Handoff Document

> **Prepared for:** Codex audit and GTM/product review  
> **Prepared by:** Project owner  
> **Access level granted:** View / Fork (read-only on production; edits only on your fork)  
> **Last updated:** May 2026

---

## 1. What Is SabiSend?

SabiSend is a money transfer rate comparison tool that helps users find the best exchange rates when sending money internationally. It covers **15 currency corridors** (GBP, EUR, USD → NGN, GHS, KES, INR, PKR) across up to 16 providers in real time.

**Live production web app:** https://sabisend.replit.app  
**iOS app (App Store):** https://apps.apple.com/gb/app/sabisend/id6763401572  
**Android app:** Coming soon (early access list at `/android-early-access`)

---

## 2. Projects & Access

### Web App + Backend (this Replit)
This is a **monorepo** — the frontend and backend live in the same project.

| Layer | Tech | Entry point |
|---|---|---|
| Frontend | React + Vite + TypeScript | `client/src/` |
| Backend | Express.js + TypeScript | `server/` |
| Database | PostgreSQL via Neon serverless | `shared/schema.ts` |
| ORM | Drizzle ORM | `server/db.ts` |

**This is the production project.** Do not push to production or trigger deployments without the owner's approval.

### Mobile App
- **iOS:** Built separately (not in this Replit). Published on the App Store — link above.
- **Android:** In development. Not yet published.

---

## 3. How to Run Locally (in your fork)

The project runs with a single command managed by the Replit workflow system:

```
npm run dev
```

This starts both the Express backend and the Vite frontend dev server on the same port. No separate terminal tabs needed.

**After forking:**
1. Fork this Replit to your own account
2. Set up the required environment variables (see Section 6 — you will need your own API keys for most services)
3. Run `npm run db:push` to initialise the database schema
4. Click the Run button or start the `Start application` workflow

> Note: Without real API keys the app will still run, but rate data will not populate from external sources. The UI and all pages will work fine.

---

## 4. Project Structure

```
/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── pages/            # Route-level page components
│       ├── components/       # Shared UI components
│       └── lib/              # Utilities (queryClient, analytics, etc.)
│
├── server/                   # Express backend
│   ├── routes.ts             # Main route registration
│   ├── routes/               # Sub-routers (alerts, blog, bridge, export, etc.)
│   ├── services/             # Business logic
│   │   ├── bridgeSyncService.ts   # Fetches live rates from bridge API hourly
│   │   └── alertNotificationService.ts  # Sends rate alert emails via Resend
│   ├── scrapers/             # Provider rate scrapers (legacy/fallback)
│   └── db.ts                 # Database connection (Neon + Drizzle)
│
├── shared/
│   └── schema.ts             # Single source of truth for all DB tables + types
│
├── client/index.html         # Apple Smart App Banner meta tag is here
└── replit.md                 # Internal project notes
```

---

## 5. Key Features (for GTM/product review)

### Rate Data Pipeline
- **Primary source:** `rates.sabisendrates.com` (bridge API) — syncs all 15 corridors every hour automatically on startup
- **Secondary source:** Wise API (official mid-market rates)
- **Fallback:** Web scrapers for providers not yet on the bridge
- **Rate tiers:** Bridge API rates are highest priority (verified=true); scraped rates are lower priority

### Providers (currently active on bridge)
LemFi, Remitly, TapTap Send, TransferGo, Sendwave, Xoom/PayPal, WorldRemit, Western Union, MonieWorld, Nala, Pesa, Remit Choice, SendApp, Yousend

### Pages / Routes
| Path | Description |
|---|---|
| `/` | Homepage with live rate snapshot |
| `/compare` | Full provider comparison tool |
| `/results` | Comparison results with calculator |
| `/trends` | Historical rate chart (30-day) |
| `/providertrend` | Per-provider trend lines |
| `/news` | Curated financial news |
| `/blog` | Blog (admin-managed) |
| `/how-it-works` | Explainer page |
| `/send-money-to-nigeria` | SEO landing pages (×5 countries) |
| `/gbp-to-ngn` | SEO corridor pages (×15 corridors) |
| `/android-early-access` | Android early access email capture |
| `/admin` | Admin dashboard (rate verification, provider management) |
| `/profile` | User profile (requires login) |

### Auth
- Google OAuth (via Replit Auth integration)
- Email/password registration also supported
- Sessions stored in PostgreSQL

### Rate Alerts
- Users set a target rate for a corridor
- System checks rates and sends email via Resend when target is hit
- Alerts table: `rate_alerts` in the DB

### AI Features
- `POST /api/ai/power-insight` — 7-day and 30-day rate forecasts, anomaly detection, send now/wait recommendations
- Powered by OpenAI GPT; results cached 20 hours to control costs
- Commentary system on the homepage ("Sabi Buzz")

### Mobile App Promotion
- Apple Smart App Banner (native iOS Safari) — in `client/index.html`
- Custom in-app banner: device-aware (iOS bottom sheet, Android early access prompt, desktop side card)
- App Store badge in footer

---

## 6. Environment Variables

> **Secret values are NOT included here.** The owner holds all keys. You will need your own keys in your fork for most integrations to work.

| Variable | Purpose | Required to run? |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes — fork will provision its own |
| `OPENAI_API_KEY` | AI forecasts and commentary | No — AI features will be skipped |
| `RESEND_API_KEY` | Email alerts and notifications | No — emails will be skipped |
| `ALPHA_VANTAGE_API_KEY` | Historical FX data | No — historical sync will skip |
| `EXCHANGE_API_KEY` | Fallback current rates | No |
| `HISTORICAL_EXCHANGE_API_KEY` | Historical rate fallback | No |
| `NEWSAPI_KEY` | Financial news feed | No |
| `WISE_API_KEY` | Wise live rates | No — Wise rates will be skipped |
| `GOOGLE_CLIENT_ID` | Google OAuth | No — login will fall back to email/password |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | No |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics | No |

**Where they are configured:** Replit Secrets panel (padlock icon in the left sidebar). Never committed to code.

---

## 7. Database

- **Engine:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM
- **Schema file:** `shared/schema.ts` — all table definitions, insert schemas, and types live here
- **Migrations:** Run `npm run db:push` to apply schema changes (no SQL files — Drizzle introspects and diffs)
- **Key tables:**

| Table | Purpose |
|---|---|
| `providers` | Provider config, logos, collection method |
| `exchange_rates` | Current rates per provider/corridor |
| `rate_trends` | Historical daily rate data (2+ years) |
| `rate_alerts` | User-set rate notifications |
| `users` | Auth users |
| `user_preferences` | Per-user corridor/provider preferences |
| `rate_cache` | Performance cache layer |
| `newsletter_subscriptions` | Email list |
| `android_early_access` | Android early access sign-ups |
| `system_settings` | App-level config flags |

---

## 8. Deployment

- **Platform:** Replit Deployments (Autoscale)
- **Trigger:** Owner-only — must click "Publish" in the Replit UI
- **Build:** Vite builds the frontend (`npm run build`), then Express serves it alongside the API
- **Domain:** Hosted at `.replit.app` (custom domain optional)
- **Production DB:** Separate Neon instance from dev — connected via `DATABASE_URL` in production secrets

> Codex should **not** have access to trigger a production deployment. Edits should be made in a fork only.

---

## 9. Admin Access

The admin dashboard is at `/admin`. It is not protected by a login in the current build (security-by-obscurity). Features include:
- Rate verification (approve/reject scraped rates)
- Provider management (enable/disable, set collection method)
- Historical data integrity tools
- Commentary scheduler

---

## 10. Things to Be Aware Of

- The bridge sync runs **automatically every hour** — no manual trigger needed. You can also trigger it manually via `POST /api/bridge/sync/all`.
- Scraper-based providers (not yet on the bridge) may have stale rates — this is known and being migrated.
- The Wise API is rate-limited; it fetches once per startup cycle.
- AI endpoints are expensive — responses are cached for 20 hours to control OpenAI costs.
- The admin panel is currently public (no login required) — access is via obscurity only.
- Do not commit API keys or `.env` files. All secrets go in Replit Secrets only.

---

## 11. Suggested Audit / Review Scope

For GTM and product improvements, focus areas would likely be:

- **Conversion:** Homepage rate card, calculator UX, CTA effectiveness
- **Retention:** Rate alerts flow, account creation friction
- **SEO:** Corridor/country landing pages, blog content strategy
- **Mobile:** iOS app parity with web, Android early access funnel
- **Data trust:** Rate freshness indicators, provider coverage gaps
- **Monetisation:** Current model is pure comparison — any affiliate/referral layer would go here

---

*This document is for internal audit use only. Do not share externally or publish.*
