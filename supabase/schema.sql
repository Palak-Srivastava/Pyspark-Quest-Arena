create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists users_email_unique_idx on users ((lower(email)));

create table if not exists questions (
  id text primary key,
  title text not null,
  category text not null,
  difficulty text not null,
  zone_id text not null,
  challenge_slug text not null,
  acceptance integer not null,
  best_runtime_ms integer not null
);

create table if not exists discussions (
  id uuid primary key default gen_random_uuid(),
  challenge_slug text not null,
  user_id uuid not null references users(id) on delete cascade,
  user_name text not null,
  comment text not null,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists discussions_challenge_slug_idx on discussions (challenge_slug, created_at desc);

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
);

create index if not exists submissions_challenge_slug_idx on submissions (challenge_slug, runtime_ms);
create index if not exists submissions_user_id_idx on submissions (user_id, created_at desc);

create table if not exists sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  refresh_hash text not null,
  csrf_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_rotated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);
