alter table user_settings
  add column if not exists game_exclusions jsonb not null default '[]'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;
