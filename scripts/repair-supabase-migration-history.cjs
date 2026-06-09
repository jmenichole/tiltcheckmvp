/**
 * Repair remote migration history to match supabase/migrations/*.sql in this repo.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=... node scripts/repair-supabase-migration-history.cjs
 *
 * Optional:
 *   SUPABASE_PROJECT_REF=tnoyhfbxsykjdbyjwthu
 *   SUPABASE_POOLER_HOST=aws-0-us-east-1.pooler.supabase.com
 */
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDir = path.join(__dirname, '../supabase/migrations');
const localMigrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => ({
    version: file.split('_')[0],
    name: file.slice(file.indexOf('_') + 1).replace(/\.sql$/, ''),
  }))
  .sort((a, b) => a.version.localeCompare(b.version));

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '');
const password = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_PASSWORD;

if (!ref || !password) {
  console.error('Set SUPABASE_URL + SUPABASE_DB_PASSWORD (or SUPABASE_PROJECT_REF + password).');
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const hosts = process.env.SUPABASE_POOLER_HOST
  ? [process.env.SUPABASE_POOLER_HOST]
  : [
      'aws-0-us-east-1.pooler.supabase.com',
      'aws-1-us-east-1.pooler.supabase.com',
      'aws-0-us-east-2.pooler.supabase.com',
      'aws-0-us-west-1.pooler.supabase.com',
      'aws-0-eu-central-1.pooler.supabase.com',
      'aws-0-eu-west-1.pooler.supabase.com',
      'aws-0-ap-southeast-1.pooler.supabase.com',
    ];

const versionList = localMigrations.map((m) => `'${m.version}'`).join(', ');
const insertValues = localMigrations
  .map((m) => `('${m.version}', '${m.name}')`)
  .join(',\n    ');

const repairSql = `
DELETE FROM supabase_migrations.schema_migrations
WHERE version NOT IN (${versionList});

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT v.version, v.name, array[]::text[]
FROM (
  VALUES
    ${insertValues}
) AS v(version, name)
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations m WHERE m.version = v.version
);
`;

async function tryUrl(label, connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    const before = await client.query(
      'select version, name from supabase_migrations.schema_migrations order by version',
    );
    console.log(`Connected via ${label}`);
    console.log('Local versions:', localMigrations.map((m) => m.version));
    console.log('Before:', before.rows);
    await client.query(repairSql);
    const after = await client.query(
      'select version, name from supabase_migrations.schema_migrations order by version',
    );
    console.log('After:', after.rows);
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed ${label}:`, err.message);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

(async () => {
  for (const host of hosts) {
    const url = `postgresql://postgres.${ref}:${encoded}@${host}:5432/postgres`;
    if (await tryUrl(host, url)) return;
  }
  console.error('Could not connect. Run supabase/repair-migration-history.sql in the SQL editor instead.');
  process.exit(1);
})();
