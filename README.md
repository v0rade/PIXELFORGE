# PIXELFORGE — Creative Asset Studio

> **Craft Ideas. Forge Visuals.**
> A full-stack creative asset management system, project & deliverable revision workspace, client collaboration portal, and public graphic design portfolio built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

---

## 1. Project Overview & Feature List

**PIXELFORGE** unifies five core workflows for freelance designers, digital artists, creative studios, and their clients:

1. **Public Graphic Design Portfolio (`/`, `/portfolio`, `/portfolio/[slug]`, `/about`, `/contact`):**
   - High-craft dark-first studio showcase with light-mode persistence, interactive case studies, design process breakdowns, and an anti-spam protected commission inquiry gateway.
2. **Private Creative Asset Management System (`/dashboard/assets`, `/dashboard/collections`):**
   - Searchable asset library with Grid and List views, multi-facet filtering (format, category, tag, project, collection), sorting, bulk operations, drag-and-drop multipart uploads (`50 MB` limit), non-traversable UUID storage paths, custom tags, curated collections, and 30-minute signed URLs for private files in the `creative-assets` bucket.
3. **Project & Deliverable Revision Workspace (`/dashboard/projects`, `/dashboard/projects/[id]`):**
   - Full project CRUD, status tracking (`draft`, `in_progress`, `in_review`, `completed`, `archived`), priority levels, deliverable version history (`v1`, `v2`, ...), and a side-by-side Version Comparison Matrix computing version jumps, file-size deltas, and review status changes.
4. **Zero-Trust Client Collaboration Portal (`/dashboard/clients`, `/invite/[token]`):**
   - Cryptographically random single-use expiring invitations (`32 bytes` / `64 hex chars`) stored exclusively as `SHA-256` hashes (`token_hash`), idempotent invitation acceptance, role-scoped client views, revision comment threads, and an **Independent Sign-Off Rule** preventing deliverable submitters from approving their own work (`SELF_APPROVAL_FORBIDDEN`).
5. **Studio Telemetry, Immutable Activity Logs & Notification Center (`/dashboard`, `/dashboard/activity`, `/dashboard/settings`):**
   - Live KPI dashboard, append-only audit logs with automatic secret redaction (`sanitizeActivityMetadata`), recipient-scoped in-app notification center with unread badges and single/bulk read actions, inbound contact inquiry triage, and a health-check endpoint (`GET /api/v1/health`).

---

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15.5 (App Router, Server & Client Components, Route Handlers, Middleware) |
| **Language** | TypeScript 5.8 (Strict mode) |
| **Styling & Motion** | Tailwind CSS 3.4, CSS Custom Properties (Dark/Light tokens), Framer Motion 12, Lucide Icons |
| **Database & Auth** | Supabase PostgreSQL 15+, `@supabase/ssr`, `@supabase/supabase-js`, Row Level Security (`FORCE ROW LEVEL SECURITY`) |
| **File Storage** | Supabase Storage (`creative-assets` private bucket with signed URLs) |
| **Validation & Forms** | Zod, React Hook Form |
| **Testing** | Vitest 3, `@electric-sql/pglite` (in-memory PostgreSQL 15 engine for real SQL + RLS policy execution) |
| **Deployment** | Vercel (Next.js Runtime) + Supabase Cloud (Free / Pro Tier) |

---

## 3. Prerequisites

- **Node.js:** `v20.11.0` or newer (`v22 LTS` recommended)
- **Package Manager:** `npm` `v10+`
- **Supabase CLI (optional for local Docker stack or remote migration push):** `npx supabase --version`
- **Git:** `v2.40+`

---

## 4. Local Setup Instructions

A fresh developer can run **PIXELFORGE** locally in two modes:
- **Mode A — Zero-Config Local Studio Mode:** Runs immediately after `npm install` using deterministic in-memory stores and signed HTTP-only cookies when Supabase environment variables are left blank.
- **Mode B — Full Supabase Mode (Local CLI or Cloud Project):** Connects to a live Supabase PostgreSQL database, GoTrue Auth, and private Storage bucket.

```bash
# 1. Clone the repository and navigate into the project directory
git clone <your-repo-url> pixel-forge
cd pixel-forge

# 2. Install dependencies
npm install

# 3. Copy the environment variable template
cp .env.example .env.local

# 4. Run verification checks (lint, typecheck, and 89 automated tests)
npm run verify

# 5. Start the development server at http://localhost:3000
npm run dev
```

---

## 5. Environment Variable Configuration

Configure these variables in `.env.local` for local development and in **Vercel Project Settings $\rightarrow$ Environment Variables** for Preview and Production deployments:

| Variable Name | Scope | Required | Where to Configure | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | `.env.local` & Vercel (`Production` / `Preview`) | Canonical origin URL used for OAuth/PKCE auth callbacks and invitation links (e.g., `http://localhost:3000` or `https://your-app.vercel.app`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | For Supabase Mode | `.env.local` & Vercel | Your Supabase project URL (`https://<project-ref>.supabase.co`). Safe for browser use. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | For Supabase Mode | `.env.local` & Vercel | Supabase public `anon` / publishable key. Enforces PostgreSQL RLS policies on every query. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Optional (Admin tasks) | `.env.local` & Vercel (Encrypted) | Privileged Supabase key. **Never prefix with `NEXT_PUBLIC_` or expose to client code.** |
| `RESEND_API_KEY` | **Server-Only** | Optional | `.env.local` & Vercel (Encrypted) | Enables real outbound transactional emails via Resend API. When omitted, PIXELFORGE uses in-app notifications only and never pretends emails were sent. |
| `EMAIL_FROM` | Server-Only | Optional | `.env.local` & Vercel | Sender address for outbound transactional emails (default: `notifications@pixelforge.studio`). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | **Server-Only** | Optional | `.env.local` & Vercel (Encrypted) | Alternative SMTP transport configuration when not using Resend. |
| `LOG_LEVEL` | Server-Only | Optional | `.env.local` & Vercel | Structured logger verbosity (`info`, `warn`, `error`). Defaults to `info`. |

---

## 6. Supabase Setup, Migrations & Storage Configuration

### Controlled Database Migration Process

All SQL schema definitions, triggers, indexes, and RLS policies are version-controlled in [`supabase/migrations/`](file:///C:/Users/LLoyD/.gemini/antigravity/scratch/pixel-forge/supabase/migrations):
1. [`20261016000001_initial_schema.sql`](file:///C:/Users/LLoyD/.gemini/antigravity/scratch/pixel-forge/supabase/migrations/20261016000001_initial_schema.sql) — Creates all 16 core tables, foreign keys, check constraints, composite/partial performance indexes, `updated_at` triggers, and `handle_new_user()` profile initialization trigger.
2. [`20261016000002_rls_policies.sql`](file:///C:/Users/LLoyD/.gemini/antigravity/scratch/pixel-forge/supabase/migrations/20261016000002_rls_policies.sql) — Enables and forces Row Level Security (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`) on all 16 tables, defines `SECURITY DEFINER` membership functions with `SET search_path = public`, column-guard triggers, and `storage.objects` policies for the private `creative-assets` bucket.

```bash
# Authenticate with Supabase CLI
npx supabase login

# Link to your remote Supabase project
npx supabase link --project-ref <your-project-ref>

# Push version-controlled migrations to production/staging database
npm run db:migrate

# (Local development only) Reset local database and apply supabase/seed.sql
npm run db:reset
```

### Authentication & Redirect URLs Configuration

In **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ URL Configuration**:
1. **Site URL:** Set to your production domain (e.g., `https://your-pixelforge.vercel.app`).
2. **Redirect URLs:** Add the following allowed callback patterns:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard/settings`
   - `https://your-pixelforge.vercel.app/auth/callback`
   - `https://your-pixelforge.vercel.app/dashboard/settings`
   - `https://*-<your-vercel-team>.vercel.app/auth/callback` (for Vercel Preview deployments)
3. **Email Templates (Authentication $\rightarrow$ Email Templates):**
   - **Confirm Signup:** Ensure the confirmation link points to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup` (or standard PKCE `{{ .ConfirmationURL }}`).
   - **Reset Password:** Ensure the recovery link points to `{{ .SiteURL }}/auth/callback?next=/dashboard/settings`.

### Private Storage Bucket Verification

Migration `20261016000002_rls_policies.sql` automatically provisions the private `creative-assets` bucket (`public = false`) and enforces `storage.objects` RLS policies:
- **Upload (`INSERT`):** Authenticated users can upload only to their own namespace prefix (`creative-assets/{auth.uid()}/...`).
- **Read (`SELECT`):** Restricted to the asset owner or accepted project members via short-lived signed URLs (`POST /api/v1/assets/[id]/signed-url`).
- **Delete (`DELETE`):** Restricted strictly to the asset owner (`owner_id = auth.uid()`).

---

## 7. Testing, Linting, Type-Checking & Build Commands

```bash
# Run ESLint across src/ (0 errors, 0 warnings)
npm run lint

# Run strict TypeScript compiler check (0 errors)
npm run typecheck

# Run full Vitest unit, PGlite RLS integration, and E2E workflow suite (89 tests across 9 suites)
npm test

# Run combined verification pipeline (lint + typecheck + test)
npm run verify

# Audit production dependencies for known vulnerabilities
npm audit --omit=dev

# Build optimized production bundle
npm run build

# Start production server locally
npm start
```

---

## 8. Vercel Deployment Instructions (Preview & Production)

1. **Import Repository into Vercel:**
   - Push the repository to GitHub/GitLab/Bitbucket and import it in the [Vercel Dashboard](https://vercel.com/new).
   - Framework Preset is automatically detected via [`vercel.json`](file:///C:/Users/LLoyD/.gemini/antigravity/scratch/pixel-forge/vercel.json) (`nextjs`).
2. **Configure Environment Variables:**
   - Add `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and (optionally) `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` for both **Production** and **Preview** environments.
3. **Apply Database Migrations Prior to Release:**
   - Run `npm run db:migrate` (`npx supabase db push`) against your target Supabase project before promoting a build to production.
4. **Verify Deployment Health:**
   - Once deployed, visit `https://<your-domain>/api/v1/health` to confirm `status: "ok"`, `databaseMode: "supabase_cloud"`, and `storageMode: "supabase_private_bucket"`.

---

## 9. Backup, Recovery & Free-Tier Constraints

### Database & Storage Backup Strategy

- **What the Supabase Free Tier Provides & Does Not Provide:**
  - The **Supabase Free Plan** does **not** include automated daily backups or Point-in-Time Recovery (PITR).
  - The **Supabase Pro Plan** includes automated daily backups (7-day retention) and optional PITR.
- **Recommended Free-Tier Backup Procedure:**
  - Run scheduled logical dumps using `pg_dump` via GitHub Actions or local CLI:
    ```bash
    npx supabase db dump --db-url "$DIRECT_DATABASE_URL" -f backup_$(date +%Y%m%d).sql
    ```
  - Keep all schema changes strictly in [`supabase/migrations/`](file:///C:/Users/LLoyD/.gemini/antigravity/scratch/pixel-forge/supabase/migrations) so the database structure can be reconstructed deterministically at any time.

### Free-Tier Limits & Operational Constraints

| Service | Free-Tier Limit | PIXELFORGE Mitigation |
| :--- | :--- | :--- |
| **Supabase Database** | `500 MB` storage; pauses after 7 days of inactivity | Composite/partial indexes keep index footprint compact; `GET /api/v1/health` can be pinged by a cron monitor to prevent inactivity pausing. |
| **Supabase Storage** | `1 GB` total storage (`50 MB` max file upload on Free Tier) | Server-side upload validator (`MAX_ASSET_FILE_SIZE = 50 * 1024 * 1024`) enforces the exact `50 MB` limit before storage transfer. |
| **Supabase Auth** | `50,000` Monthly Active Users; built-in email rate limit (~2–4 emails/hr on default SMTP) | Custom SMTP or `RESEND_API_KEY` can be attached for production email volume; in-app notifications work with zero email dependency. |
| **Vercel Hobby Plan** | `100 GB` bandwidth/month; Serverless Function timeout `10s–60s`; `4.5 MB` serverless request body limit | Direct Supabase Storage uploads are supported when Supabase is configured; API routes use pagination (`limit <= 50`) and fast indexed queries. |

---

## 10. Security Notes & Troubleshooting

### Security Architecture Summary
- **Row Level Security (`FORCE ROW LEVEL SECURITY`):** Enabled on all 16 tables so even table owners cannot bypass policies without explicit `service_role`.
- **Zero-Trust Invitations:** Raw tokens are generated with 256 bits of CSPRNG entropy (`crypto.randomBytes(32)`) and hashed with `SHA-256` before persistence.
- **Independent Deliverable Sign-Off:** Server-side checks and database policies block submitters from approving their own deliverables.
- **HTTP Security Headers & Rate Limiting:** CSP (`object-src 'none'`, `frame-ancestors 'none'`), HSTS, `X-Frame-Options: DENY`, `nosniff`, and sliding-window rate limiters protect all auth, invitation, and contact endpoints.

### Troubleshooting

- **Auth Redirect Loops or `Invalid Redirect URL` on Login/Signup:**
  - Verify `NEXT_PUBLIC_APP_URL` matches your browser origin (`http://localhost:3000` locally) and that `<origin>/auth/callback` is listed in Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ URL Configuration.
- **`429 RATE_LIMIT_EXCEEDED` During Rapid Testing:**
  - Auth and public contact endpoints enforce sliding-window rate limits per IP. Wait for the `Retry-After` header duration (60 seconds for auth routes) or restart the dev server.
- **Private Asset Previews Returning `403` or `404`:**
  - Ensure the `creative-assets` bucket exists in Supabase Storage (`20261016000002_rls_policies.sql`) and that the requesting user is either the asset owner or an accepted member of a project linked to that asset.
