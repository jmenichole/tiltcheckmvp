-- Email-sourced bonus inbox feed (single document row for Railway persistence)

create table if not exists bonus_inbox_feed (
  id text primary key default 'default',
  updated_at timestamptz,
  payload jsonb not null default '{"updatedAt":null,"bonuses":[]}'::jsonb
);

insert into bonus_inbox_feed (id, updated_at, payload)
values ('default', null, '{"updatedAt":null,"bonuses":[]}'::jsonb)
on conflict (id) do nothing;
