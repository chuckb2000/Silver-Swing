#!/usr/bin/env bash
# Live match play on this computer: the match Worker (its Durable Object) and
# the built site with its Pages Functions, both under wrangler, as on
# Cloudflare. Then open http://localhost:8788 in two browsers (or a normal and
# a private window: each needs its own player code).
#
#   cd game && npm run build && bash scripts/match-dev.sh
#
# The tests use it too: MATCH_URL=http://localhost:8788 npx vitest run tests/unit/match_live.test.ts
# Here only (never on Cloudflare): MATCH_DEBUG=1 lets the tests move a match's clock on
# (POST localhost:8787/debug/<code>/skip?ms=N). MATCH_D1=1 also gives the site a fresh local
# leaderboard database (DB; the "recent" list), which then checks names: one name per browser.
set -euo pipefail
cd "$(dirname "$0")/.."
W=match-worker/node_modules/.bin/wrangler
if [ ! -x "$W" ]; then (cd match-worker && npm install --no-audit --no-fund); fi
[ -d dist ] || { echo "build first: npm run build"; exit 1; }
LOGS=${MATCH_LOGS:-/tmp}
(cd match-worker && exec ../$W dev --port "${MATCH_WORKER_PORT:-8787}" --var MATCH_DEBUG:1 > "$LOGS/match-worker.log" 2>&1) &
WORKER=$!
trap 'kill $WORKER 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do grep -q "Ready on" "$LOGS/match-worker.log" 2>/dev/null && break; sleep 1; done
D1=()
if [ "${MATCH_D1:-}" = 1 ]; then rm -rf "$LOGS/pages-state"; D1=(--d1 DB --persist-to "$LOGS/pages-state"); fi
exec $W pages dev dist --port "${MATCH_SITE_PORT:-8788}" --do MATCH=MatchRoom@silver-swings-match ${D1[@]+"${D1[@]}"} --compatibility-date 2026-09-01
