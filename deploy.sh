#!/bin/bash
# ──────────────────────────────────────────────────────────────
# deploy.sh — Build frontend + push to GitHub  (Rent Ride)
# Usage: bash deploy.sh "commit message"
# ──────────────────────────────────────────────────────────────
set -e

MSG="${1:-chore: deploy update}"

echo ""
echo "🔨 [1/3] Building frontend..."
npm run build

echo ""
echo "📝 [2/3] Committing (dist + src)..."
git add -A
git commit -m "$MSG" || echo "  ℹ️  Nothing new to commit"

BACKEND_PKG_CHANGED=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep -c "backend/package.json" || true)
HTACCESS_CHANGED=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep -c "public/.htaccess" || true)

echo ""
echo "🚀 [3/3] Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Push u bë! Tani ekzekuto në SERVER (SSH / cPanel Terminal):"
echo ""
echo "  # ── Rregullo NJË HERË sipas cPanel-it tënd: ──"
echo "  APP=~/rent-ride                 # ku është klonuar repo"
echo "  DOCROOT=~/rentride.al            # document root i domain-it (kontrollo te cPanel → Domains)"
echo ""
echo "  cd \$APP"
echo "  git pull origin main"
echo ""
echo "  # Deploy frontend te document root:"
echo "  rm -rf \$DOCROOT/assets"
echo "  rm -f \$DOCROOT/index.html \$DOCROOT/*.svg \$DOCROOT/robots.txt"
echo "  cp -r dist/assets dist/index.html dist/*.svg dist/robots.txt \$DOCROOT/"
echo ""
echo "  # Verifikim:"
echo "  grep -oE 'index-[A-Za-z0-9_-]+\\.js' \$DOCROOT/index.html"
echo "  curl -sSI https://rentride.al/ | grep -iE 'cache-control'"

if [ "$BACKEND_PKG_CHANGED" -gt "0" ]; then
  echo ""
  echo "  ⚠️  backend/package.json ndryshoi — Run NPM Install nga cPanel:"
  echo "  cPanel → Setup Node.js App → Edit → Run NPM Install"
fi

if [ "$HTACCESS_CHANGED" -gt "0" ]; then
  echo ""
  echo "  ⚠️  .htaccess ndryshoi — kërkohet ribashkim me Passenger config:"
  echo "  1. cp dist/.htaccess \$DOCROOT/.htaccess"
  echo "  2. cPanel → Setup Node.js App → Stop → Start"
fi

echo ""
echo "  # Restart Node app pas çdo deploy:"
echo "  cPanel → Setup Node.js App → klik Restart"
echo ""
