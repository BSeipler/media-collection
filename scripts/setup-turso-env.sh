#!/usr/bin/env bash
# Create .env.local with a Turso DB token after `turso auth login`.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

if ! turso auth whoami >/dev/null 2>&1; then
  echo "Not logged in to Turso. Run: turso auth login"
  exit 1
fi

TOKEN=$(turso db tokens create media-collection -e never)
URL="libsql://media-collection-bseipler.aws-us-east-1.turso.io"

# Update or append Turso vars without printing the token
if grep -q '^TURSO_DATABASE_URL=' .env.local; then
  sed -i.bak "s|^TURSO_DATABASE_URL=.*|TURSO_DATABASE_URL=${URL}|" .env.local
else
  echo "TURSO_DATABASE_URL=${URL}" >> .env.local
fi
if grep -q '^TURSO_AUTH_TOKEN=' .env.local; then
  sed -i.bak "s|^TURSO_AUTH_TOKEN=.*|TURSO_AUTH_TOKEN=${TOKEN}|" .env.local
else
  echo "TURSO_AUTH_TOKEN=${TOKEN}" >> .env.local
fi
rm -f .env.local.bak

echo "Wrote TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env.local"
echo "Fill TMDB_API_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, APP_PASSWORD next."
