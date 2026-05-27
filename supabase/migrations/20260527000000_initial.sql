-- TiltCheck v2 minimal schema

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  username text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  risk_profile text not null default 'moderate' check (risk_profile in ('conservative', 'moderate', 'degen')),
  notifications_enabled boolean not null default true,
  demo_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists vault_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists vault_rules_user_id_idx on vault_rules(user_id);

create table if not exists casino_scores (
  id uuid primary key default gen_random_uuid(),
  casino_name text not null unique,
  current_score numeric not null default 0,
  risk_level text not null default 'Unknown',
  events_24h integer not null default 0,
  updated_at timestamptz not null default now()
);
