#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required. https://nodejs.org/"
  exit 1
fi
exec node admin/server.mjs "$@"
