#!/bin/bash

# Deployment script for inbidz-app API (api.inbidz.com)
# Usage: ./deploy.sh
# Optional env:
#   GIT_BRANCH=main
#   DEPLOY_DIR=/home/inbidz-api/htdocs/api.inbidz.com
#   SITE_URL=https://api.inbidz.com
#   WEB_ORIGIN=https://app.inbidz.com   # CORS health check origin
#   RUN_MIGRATE=1                       # run DB migrations after build

set -e

SITE_URL="${SITE_URL:-https://api.inbidz.com}"
WEB_ORIGIN="${WEB_ORIGIN:-https://app.inbidz.com}"
GIT_BRANCH="${GIT_BRANCH:-main}"
PM2_APP_NAME="inbidz-api"
STAGING_DIR=".next-staging"
PORT=3003

echo "🚀 Deploying InBidz API (production) @ $(date)"
echo "   Site: $SITE_URL"
echo "   Web app origin: $WEB_ORIGIN"
echo "   Branch: $GIT_BRANCH"
echo "   Port: $PORT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -n "${DEPLOY_DIR:-}" ]; then
  cd "$DEPLOY_DIR" || {
    echo "❌ Could not enter DEPLOY_DIR ($DEPLOY_DIR). Exiting."
    exit 1
  }
  REPO_ROOT="$(pwd)"
  API_DIR="$REPO_ROOT/apps/api"
else
  cd "$REPO_ROOT" || {
    echo "❌ Could not enter repo root ($REPO_ROOT). Exiting."
    exit 1
  }
fi

echo "📂 Repo root: $REPO_ROOT"
echo "📂 API dir:   $API_DIR"

echo "🔍 Checking Node.js version..."
CURRENT_NODE="$(node -v | sed 's/v//')"
REQUIRED_NODE_MAJOR=18
REQUIRED_NODE_MINOR=17
NODE_MAJOR="$(echo "$CURRENT_NODE" | cut -d'.' -f1)"
NODE_MINOR="$(echo "$CURRENT_NODE" | cut -d'.' -f2)"

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ] || {
  [ "$NODE_MAJOR" -eq "$REQUIRED_NODE_MAJOR" ] && [ "$NODE_MINOR" -lt "$REQUIRED_NODE_MINOR" ]
}; then
  echo "❌ Node.js version $(node -v) is too old."
  echo "   Required: Node.js >= 18.17.0"
  exit 1
fi
echo "   ✅ Node.js version: $(node -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "⚠️  PM2 not found. Installing globally..."
  npm install -g pm2 || {
    echo "❌ Failed to install PM2. Please install manually: npm install -g pm2"
    exit 1
  }
fi

if [ ! -f "$API_DIR/.env.local" ]; then
  echo "❌ $API_DIR/.env.local not found."
  echo "   Copy apps/api/.env.production.example → .env.local and set production values."
  exit 1
fi

echo "📥 Pulling latest code..."
if git rev-parse --git-dir >/dev/null 2>&1; then
  git config --global --add safe.directory "$REPO_ROOT" 2>/dev/null || true
  git pull origin "$GIT_BRANCH" --no-ff || {
    echo "❌ Git pull failed. Exiting."
    exit 1
  }
else
  echo "⚠️  Not a git repository. Continuing with existing code..."
fi

echo "📦 Installing dependencies (monorepo root)..."
npm install --production=false || {
  echo "❌ npm install failed. Exiting."
  exit 1
}

echo "🏗 Building @inbidz/shared..."
npm run build --workspace=@inbidz/shared || {
  echo "❌ Shared package build failed. Exiting."
  exit 1
}

echo "🏗 Building API (staging directory, live .next untouched)..."
echo "   ✅ Next.js production build"
echo "   ✅ TypeScript compilation"
cd "$API_DIR"
rm -rf "$STAGING_DIR"
NEXT_DIST_DIR="$STAGING_DIR" npm run build || {
  echo "❌ API build failed. Exiting."
  exit 1
}

echo "📦 Swapping build output..."
if [ ! -d "$STAGING_DIR" ]; then
  echo "❌ Build output missing ($STAGING_DIR)."
  echo "   Ensure next.config.js sets distDir: process.env.NEXT_DIST_DIR || '.next'"
  exit 1
fi
if [ -d ".next" ]; then
  rm -rf .next-old
  mv .next .next-old
fi
mv "$STAGING_DIR" .next
rm -rf .next-old

mkdir -p logs

if [ "${RUN_MIGRATE:-0}" = "1" ]; then
  echo "🗄 Running database migrations..."
  npm run migrate || {
    echo "❌ Migration failed. Exiting."
    exit 1
  }
fi

echo "🔁 Reloading PM2 process (zero downtime)..."
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production || {
    echo "⚠️  PM2 reload failed. Falling back to restart..."
    pm2 restart ecosystem.config.js --env production || {
      echo "❌ PM2 restart failed. Exiting."
      exit 1
    }
  }
else
  echo "   🆕 Starting new PM2 process..."
  pm2 start ecosystem.config.js --env production || {
    echo "❌ PM2 start failed. Exiting."
    exit 1
  }
fi

echo "✅ Done! InBidz API is now live @ $(date)"

echo ""
echo "🎯 Deployment Summary:"
echo "   ✅ Latest code pulled from $GIT_BRANCH"
echo "   ✅ Monorepo dependencies installed"
echo "   ✅ @inbidz/shared + API build completed (zero-downtime swap)"
echo "   ✅ PM2 process reloaded"
echo "   ✅ App serving on port $PORT → $SITE_URL"
echo ""
echo "🔍 Quick Health Check:"
echo "   1. curl -s $SITE_URL/api/health"
echo "   2. curl -sI -X OPTIONS -H 'Origin: $WEB_ORIGIN' -H 'Access-Control-Request-Method: POST' $SITE_URL/api/posts"
echo "   3. Share preview: $SITE_URL/p/{code}"
echo "   4. Universal Links: $SITE_URL/.well-known/apple-app-site-association"
echo "   5. Monitor logs: cd apps/api && npm run pm2:logs"
echo ""
echo "📊 PM2 Commands (from apps/api):"
echo "   - Status:  npm run pm2:status"
echo "   - Logs:    npm run pm2:logs"
echo "   - Restart: npm run pm2:restart"
echo ""
echo "🌐 InBidz API (production) is ready!"
