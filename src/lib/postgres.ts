import postgres from "postgres";

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

const missingDbUrlHandler = () => {
  throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL) environment variable.");
};

export const sql = (connectionString
  ? postgres(connectionString, {
      ssl: "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 20,
    })
  : (missingDbUrlHandler as unknown as ReturnType<typeof postgres>));

let schemaReadyPromise: Promise<void> | null = null;

declare global {
  var __sparkQuestSchemaReadyPromise: Promise<void> | undefined;
}

export async function ensureDatabaseSchema() {
  const isProduction = process.env.NODE_ENV === "production";
  const autoInitInDev = process.env.DB_AUTO_INIT_SCHEMA !== "false";
  const allowProdSchemaInit = process.env.PROD_DB_AUTO_INIT_SCHEMA === "true";

  if ((!isProduction && !autoInitInDev) || (isProduction && !allowProdSchemaInit)) {
    return;
  }

  if (globalThis.__sparkQuestSchemaReadyPromise) {
    schemaReadyPromise = globalThis.__sparkQuestSchemaReadyPromise;
  }

  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    await sql`create extension if not exists pgcrypto`;

    await sql`
      create table if not exists users (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text not null,
        password_hash text not null,
        created_at timestamptz not null default now()
      )
    `;

    await sql`create unique index if not exists users_email_unique_idx on users ((lower(email)))`;

    await sql`
      create table if not exists questions (
        id text primary key,
        title text not null,
        description text not null default '',
        problem_statement text not null default '',
        category text not null,
        difficulty text not null,
        zone_id text not null,
        challenge_slug text not null,
        acceptance integer not null,
        best_runtime_ms integer not null,
        solved_count integer not null default 0,
        company_tags text[] not null default '{}',
        input_schema jsonb,
        output_schema jsonb,
        constraints text[],
        hints text[],
        walkthrough jsonb,
        expected_output text,
        test_cases jsonb,
        editorial text not null default ''
      )
    `;

    await sql`alter table questions add column if not exists description text not null default ''`;
    await sql`alter table questions add column if not exists solved_count integer not null default 0`;
    await sql`alter table questions add column if not exists company_tags text[] not null default '{}'`;
    await sql`alter table questions add column if not exists problem_statement text not null default ''`;
    await sql`alter table questions add column if not exists input_schema jsonb`;
    await sql`alter table questions add column if not exists output_schema jsonb`;
    await sql`alter table questions add column if not exists constraints text[]`;
    await sql`alter table questions add column if not exists hints text[]`;
    await sql`alter table questions add column if not exists walkthrough jsonb`;
    await sql`alter table questions add column if not exists expected_output text`;
    await sql`alter table questions add column if not exists test_cases jsonb`;
    await sql`alter table questions add column if not exists editorial text not null default ''`;
    await sql`create index if not exists questions_zone_id_idx on questions (zone_id)`;
    await sql`create index if not exists questions_zone_difficulty_idx on questions (zone_id, difficulty)`;
    await sql`create index if not exists questions_solved_runtime_idx on questions (zone_id, solved_count desc, best_runtime_ms asc)`;
    await sql`create index if not exists questions_company_tags_gin_idx on questions using gin (company_tags)`;
    await sql`create index if not exists questions_search_idx on questions using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'')))`;

    await sql`
      create table if not exists discussions (
        id uuid primary key default gen_random_uuid(),
        challenge_slug text not null,
        user_id uuid not null references users(id) on delete cascade,
        user_name text not null,
        comment text not null,
        likes integer not null default 0,
        created_at timestamptz not null default now()
      )
    `;

    await sql`create index if not exists discussions_challenge_slug_idx on discussions (challenge_slug, created_at desc)`;

    await sql`
      create table if not exists discussion_reports (
        id uuid primary key default gen_random_uuid(),
        discussion_id uuid not null references discussions(id) on delete cascade,
        reporter_user_id uuid not null references users(id) on delete cascade,
        reason text not null,
        created_at timestamptz not null default now(),
        unique (discussion_id, reporter_user_id)
      )
    `;

    await sql`create index if not exists discussion_reports_discussion_id_idx on discussion_reports (discussion_id)`;

    await sql`
      create table if not exists submissions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        user_name text not null,
        challenge_slug text not null,
        question_id text not null,
        score integer not null,
        runtime_ms integer not null,
        memory_mb integer not null,
        status text not null check (status in ('passed', 'failed')),
        created_at timestamptz not null default now()
      )
    `;

    await sql`create index if not exists submissions_challenge_slug_idx on submissions (challenge_slug, runtime_ms)`;
    await sql`create index if not exists submissions_user_id_idx on submissions (user_id, created_at desc)`;

    await sql`
      create table if not exists submission_jobs (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        user_name text not null,
        challenge_slug text not null,
        question_id text not null,
        code text not null,
        execution_mode text not null check (execution_mode in ('safe-sandbox','heuristic')),
        status text not null check (status in ('queued', 'running', 'completed', 'failed', 'timed_out')) default 'queued',
        result jsonb,
        error text,
        timeout_ms integer not null default 12000,
        memory_limit_mb integer not null default 512,
        created_at timestamptz not null default now(),
        started_at timestamptz,
        finished_at timestamptz
      )
    `;

    await sql`create index if not exists submission_jobs_user_id_idx on submission_jobs (user_id, created_at desc)`;
    await sql`create index if not exists submission_jobs_status_idx on submission_jobs (status, created_at asc)`;

    await sql`
      create table if not exists bookmarks (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        question_id text not null references questions(id) on delete cascade,
        created_at timestamptz not null default now(),
        unique (user_id, question_id)
      )
    `;

    await sql`create index if not exists bookmarks_user_id_idx on bookmarks (user_id, created_at desc)`;
    await sql`create index if not exists bookmarks_question_id_idx on bookmarks (question_id)`;

    await sql`
      create table if not exists sessions (
        id uuid primary key,
        user_id uuid not null references users(id) on delete cascade,
        refresh_hash text not null,
        csrf_hash text not null,
        expires_at timestamptz not null,
        created_at timestamptz not null default now(),
        last_rotated_at timestamptz not null default now(),
        revoked_at timestamptz
      )
    `;

    await sql`create index if not exists sessions_user_id_idx on sessions (user_id)`;
    await sql`create index if not exists sessions_expires_at_idx on sessions (expires_at)`;
  })();

  globalThis.__sparkQuestSchemaReadyPromise = schemaReadyPromise;

  return schemaReadyPromise;
}
