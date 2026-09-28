#!/bin/sh
# Container entrypoint: apply pending migrations, then start the server.
#
# Why this is not a one-off manual step: the schema has to be correct before the
# new code serves a request. Running it here means a deploy cannot start a
# container against a stale schema, and there is no window where an operator has
# to remember to run it in the right order.
#
# `migrate deploy` applies pending migrations and nothing else. It never drops or
# resets, and it is safe on every boot — with no pending migrations it is a
# no-op. Do not use `migrate dev` or `migrate reset` here; both can destroy data.
set -e

echo "[entrypoint] waiting for postgres…"

# Bounded wait rather than an infinite loop, so a bad DATABASE_URL surfaces as a
# failed container rather than a silently restarting one.
attempt=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "[entrypoint] database unreachable after 30 attempts; giving up." >&2
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] database is up."

echo "[entrypoint] applying migrations…"
npx prisma migrate deploy

# Seed only on a genuinely empty database. The seed is idempotent and
# upsert-based, so re-running it is harmless, but skipping it when content
# already exists keeps every boot fast and avoids touching live rows.
echo "[entrypoint] checking whether content needs seeding…"
NEEDS_SEED=$(node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect()
    .then(() => c.query(\"SELECT to_regclass('public.\\\"Topic\\\"') IS NOT NULL AS t, (SELECT count(*) FROM \\\"Topic\\\") AS n\"))
    .then(r => { const t = r.rows[0].t, n = Number(r.rows[0].n); console.log(!t || n === 0 ? 'yes' : 'no'); return c.end(); })
    .catch(() => { console.log('yes'); });
")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "[entrypoint] empty database — seeding content (first boot only)…"
  npx prisma db seed
else
  echo "[entrypoint] content present — skipping seed."
fi

echo "[entrypoint] starting server on :${PORT:-3000}"
exec node server.js
