#!/usr/bin/env bash
# Prepare a plain, empty Postgres for the substrate SQL suites: apply the
# Supabase stand-ins (supabase-stubs.sql), then every migration in order.
#
#   DATABASE_URL=postgres://…  bash supabase/tests/migrate.sh
#   DATABASE_URL=postgres://…  bash supabase/tests/run.sh
#
# For a throwaway database only (CI service container, or the cluster from
# app/scripts/test-postgres.sh). Never point it at a Supabase project.
set -euo pipefail

DB="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DB" ]]; then
  echo "error: set DATABASE_URL to an empty throwaway database" >&2
  exit 2
fi

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
psql "$DB" -v ON_ERROR_STOP=1 -q -f "$dir/supabase-stubs.sql"
for f in "$dir"/../migrations/*.sql; do
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null || {
    echo "migration failed: $(basename "$f")" >&2
    exit 1
  }
done
echo "substrate migrated: $(ls "$dir"/../migrations/*.sql | wc -l) migrations"
