#!/bin/bash
# SessionStart hook — install dependencies so typecheck, tests, lint and the
# substrate test runner work in Claude Code on the web sessions.
set -euo pipefail

# Only needed in remote (web) sessions; local checkouts already have deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# The Next.js app (with all the test/lint tooling) lives in app/.
cd "${CLAUDE_PROJECT_DIR:-.}/app"

# Ensure pnpm is available, then install (uses the content-addressable store
# cache; idempotent and non-interactive).
corepack enable >/dev/null 2>&1 || true
pnpm install --prefer-offline

echo "session-start: app dependencies installed"
