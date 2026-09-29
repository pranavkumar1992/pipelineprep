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
#
# We test TCP connectivity with wget rather than `require('pg')` because the
# Next.js standalone output only traces directly-imported modules — pg is an
# internal Prisma dependency and is not in the runtime node_modules.
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
attempt=0
until wget -qO /dev/null --timeout=2 "http://${DB_HOST}:${DB_PORT}" 2>/dev/null || \
      wget -qO /dev/null --timeout=2 "http://${DB_HOST}:${DB_PORT}" 2>&1 | grep -q "error getting response"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "[entrypoint] database unreachable at ${DB_HOST}:${DB_PORT} after 30 attempts; giving up." >&2
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
#
# We use prisma's own query capability rather than require('pg'), since the
# standalone Next.js build doesn't include pg in its traced modules.
echo "[entrypoint] checking whether content needs seeding…"
TOPIC_COUNT=$(npx prisma db execute --stdin <<'SQL' 2>/dev/null | grep -oE '[0-9]+' | head -1
SELECT count(*) FROM "Topic";
SQL
)

if [ -z "$TOPIC_COUNT" ] || [ "$TOPIC_COUNT" = "0" ]; then
  echo "[entrypoint] empty database — seeding content (first boot only)…"
  if npx prisma db seed; then
    echo "[entrypoint] seeding complete."
  else
    echo "[entrypoint] ⚠ seed failed (non-fatal). The app will start without demo content." >&2
    echo "[entrypoint] You can seed manually later with: docker exec pipelineprep-app npx prisma db seed" >&2
  fi
else
  echo "[entrypoint] content present ($TOPIC_COUNT topics) — skipping seed."
fi

echo "[entrypoint] starting server on :${PORT:-3000}"
exec node server.js
