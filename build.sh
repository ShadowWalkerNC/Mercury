#!/usr/bin/env bash
set -e

ROOT="$PWD"
export PATH="$ROOT/node_modules/.bin:$PATH"

echo "--- building @mercury/shared ---"
tsc --project "$ROOT/packages/shared/tsconfig.json"

echo "--- building @mercury/server ---"
tsc --project "$ROOT/packages/server/tsconfig.json"

echo "--- building @mercury/web ---"
cd "$ROOT/packages/web"
vite build
cd "$ROOT"

echo "--- build complete ---"
