# Spark Practice Arena — Launch Checklist

Use this checklist to move from local build-ready state to public production launch.

## 1) Production environment variables
Set these in your hosting platform (not in git):

- `SUPABASE_DB_URL` (or `DATABASE_URL`)
- `AUTH_SECRET` (32+ chars)
- `NEXT_PUBLIC_SITE_URL` (your public domain)
- `NEXT_PUBLIC_GITHUB_REPO_URL` (public repo URL)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `SANDBOX_MODE=safe`
- `SANDBOX_RUNNER_URL`
- `SANDBOX_RUNNER_TOKEN`
- `AI_REVIEW_ENABLED`
- `OPENAI_API_KEY`

Keep these safe in production:
- `PROD_DB_AUTO_INIT_SCHEMA=false`
- Do not rely on `DB_AUTO_INIT_SCHEMA` / `DB_SKIP_SEED_CHECK` in production.

## 2) Deploy checks
After deployment, verify:

- `GET /api/health` returns 200
- `GET /api/ready` returns 200
- Login/register works
- Submit + poll flow works
- Leaderboard/profile update after submission

## 3) SEO and discoverability
- Confirm `robots.txt`: `/robots.txt`
- Confirm sitemap: `/sitemap.xml`
- Add site to Google Search Console
- Submit sitemap URL in Search Console
- Add Open Graph image and brand assets
- Publish 10–20 strong content pages/blog posts targeting “spark practice” and “pyspark interview questions”

## 4) Open-source readiness
- Push repo public on GitHub
- Ensure `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` are present
- Configure issue templates
- Replace placeholder security link in `.github/ISSUE_TEMPLATE/config.yml`

## 5) Moderation and abuse controls
- Confirm Redis rate limiting is active in production
- Verify discussion report flow works
- Monitor submission/report abuse patterns

## 6) Launch day
- Announce on LinkedIn, Reddit, X, data engineering communities
- Share direct practice links
- Collect user feedback from bug templates
- Track top slow endpoints and improve iteratively

## 7) First week after launch
- Fix top 5 user-reported bugs
- Improve search snippets/titles based on Search Console data
- Add high-value PySpark interview questions weekly
