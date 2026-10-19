#!/usr/bin/env bash
# A throwaway Postgres cluster for the postgres backend's integration tests
# (lib/data/repo/postgres.integration.test.ts). Starts one under a new
# directory in /tmp and prints the TEST_DATABASE_URL to use; `stop <dir>`
# stops it and removes the directory.
#
#   eval "$(scripts/test-postgres.sh start)"   # sets TEST_DATABASE_URL and PG_TEST_DIR
#   npx vitest run src/lib/data/repo
#   scripts/test-postgres.sh stop "$PG_TEST_DIR"
#
# PG_BIN (default /usr/lib/postgresql/16/bin) and PG_PORT (default 55432)
# choose the binaries and port. As root, the cluster runs as the postgres user.
set -euo pipefail
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PG_PORT="${PG_PORT:-55432}"

as_owner() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

case "${1:-start}" in
  start)
    dir="$(mktemp -d /tmp/civicos-pg-XXXXXX)"
    [ "$(id -u)" = "0" ] && chown postgres:postgres "$dir"
    as_owner "$PG_BIN/initdb" -D "$dir/data" -U postgres --auth=trust >"$dir/initdb.log" 2>&1
    as_owner "$PG_BIN/pg_ctl" -D "$dir/data" -l "$dir/server.log" -w \
      -o "-p $PG_PORT -k $dir -c listen_addresses=127.0.0.1 -c fsync=off" start >/dev/null
    echo "export PG_TEST_DIR=$dir"
    echo "export TEST_DATABASE_URL=postgres://postgres@127.0.0.1:$PG_PORT/postgres"
    ;;
  stop)
    dir="${2:?the directory printed by start}"
    as_owner "$PG_BIN/pg_ctl" -D "$dir/data" -m fast stop >/dev/null || true
    rm -rf "$dir"
    ;;
  *) echo "usage: $0 start | stop <dir>" >&2; exit 2 ;;
esac
