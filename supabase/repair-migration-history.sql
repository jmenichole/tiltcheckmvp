-- Run once in Supabase SQL Editor (project tnoyhfbxsykjdbyjwthu)
-- Fixes: "Remote migration versions not found in local migrations directory"
--
-- 1) Inspect current history
select version, name from supabase_migrations.schema_migrations order by version;

-- 2) Drop remote-only versions that are not in supabase/migrations/
delete from supabase_migrations.schema_migrations
where version not in (
  '20260527000000',
  '20260528120000',
  '20260607120000'
);

-- 3) Mark repo migrations as applied when schema already exists (idempotent SQL)
insert into supabase_migrations.schema_migrations (version, name, statements)
select v.version, v.name, array[]::text[]
from (
  values
    ('20260527000000', 'initial'),
    ('20260528120000', 'game_exclusions'),
    ('20260607120000', 'bonus_inbox_feed')
) as v(version, name)
where not exists (
  select 1
  from supabase_migrations.schema_migrations m
  where m.version = v.version
);

-- 4) Verify
select version, name from supabase_migrations.schema_migrations order by version;
