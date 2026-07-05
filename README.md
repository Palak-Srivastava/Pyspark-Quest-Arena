# Spark Quest Arena

Interactive PySpark coding game built with Next.js, Supabase Postgres, JWT auth, session rotation, and CSRF protection.

## Features
- Animated landing page
- Arena mission cards
- Challenge detail room
- Cloud-persistent leaderboard page
- Cloud-persistent profile progression page
- Postgres-backed auth/discussions/submissions
- Rotating JWT + refresh session cookies
- CSRF protection for state-changing requests

## Run locally
1. Install dependencies:
   - `npm install`
2. Create env file:
   - copy `.env.example` to `.env.local`
   - set `SUPABASE_DB_URL` and `AUTH_SECRET`
3. (Optional) run SQL manually in Supabase SQL editor:
   - `supabase/schema.sql`
4. Start dev server:
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Build
- `npm run build`
- `npm run start`

## Launch guide
- See `LAUNCH_CHECKLIST.md` for production go-live steps.

## Health checks
- Liveness: `/api/health`
- Readiness: `/api/ready`

Use `/api/ready` in deployment probes to validate env + DB + required tables.

## Security Notes
- `AUTH_SECRET` must be long and private (32+ chars)
- Session cookies are `httpOnly` and refresh tokens are rotated
- Mutating APIs require `x-csrf-token`

## Production hardening notes
- Dev-only flags are automatically disabled in production:
   - `DB_AUTO_INIT_SCHEMA`
   - `DB_SKIP_SEED_CHECK`
- Runtime schema initialization in production is blocked by default.
   - Set `PROD_DB_AUTO_INIT_SCHEMA=true` only if you intentionally want it.

## Go-live checklist (production)
- Set environment variables:
   - `SUPABASE_DB_URL`
   - `AUTH_SECRET` (32+ chars)
   - `NEXT_PUBLIC_SITE_URL` (your real domain)
   - `NEXT_PUBLIC_GITHUB_REPO_URL`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
- Keep production-safe DB flags:
   - `DB_AUTO_INIT_SCHEMA=true` only for managed migration step, otherwise use explicit migrations
   - `DB_SKIP_SEED_CHECK=false` for first-time setup
- Configure sandbox runner if strict evaluation is needed:
   - `SANDBOX_MODE=safe`
   - `SANDBOX_RUNNER_URL`
   - `SANDBOX_RUNNER_TOKEN`
- Optional AI feedback:
   - `AI_REVIEW_ENABLED=true`
   - `OPENAI_API_KEY`
   - Keep `AI_REVIEW_ENFORCE=false` initially and monitor quality.

## Open source setup
- `LICENSE` added (MIT)
- `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` added
- GitHub issue templates added under `.github/ISSUE_TEMPLATE`
- In-app community page: `/open-source`

## SEO notes
- Technical SEO is configured (`metadata`, `robots`, `sitemap`).
- Ranking #1 on Google is not guaranteed by code alone.
- To improve ranking, focus on:
   - high-quality useful content,
   - consistent updates,
   - backlinks/mentions,
   - Core Web Vitals and page speed,
   - clear titles/descriptions and indexed pages.
