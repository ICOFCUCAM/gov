#!/usr/bin/env bash
# Run the substrate SQL regression suite against a migrated database.
#
#   DATABASE_URL=postgres://…  bash supabase/tests/run.sh
#
# Each *_test.sql file is self-contained (begin/rollback, RAISE on failure).
# ON_ERROR_STOP=1 makes any failed assertion abort with a non-zero exit, so
# this is CI-friendly. Point DATABASE_URL at a throwaway / branch DB, or the
# service-role connection (some suites exercise service-role-gated RPCs).
set -euo pipefail

DB="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DB" ]]; then
  echo "error: set DATABASE_URL (or SUPABASE_DB_URL) to a migrated database" >&2
  exit 2
fi

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail=0
for f in "$dir"/*_test.sql; do
  echo "── $(basename "$f")"
  if psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f"; then
    echo "   ok"
  else
    echo "   FAILED" >&2
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "substrate tests: FAILURES" >&2
  exit 1
fi
echo "substrate tests: all suites passed"
