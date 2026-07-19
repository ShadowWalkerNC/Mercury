#!/usr/bin/env bash
set -e

# Add root node_modules/.bin to PATH so tsc and vite resolve correctly
export PATH="$PWD/node_modules/.bin:$PATH"

echo "--- building @mercury/shared ---"
cd packages/shared
tsc
cd ../..

echo "--- building @mercury/server ---"
cd packages/server
tsc
cd ../..

echo "--- building @mercury/web ---"
cd packages/web
vite build
cd ../..

echo "--- build complete ---"
