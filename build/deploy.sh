#!/usr/bin/env bash
set -Eeuo pipefail

trap 'code=$?; printf "::error::Deployment failed at line %s (exit %s).\n" "$LINENO" "$code" >&2; exit "$code"' ERR
fail() {
  printf '::error::%s\n' "$1" >&2
  exit 1
}

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/html/UserAlfresco-api}"
export PM2_HOME="${PM2_HOME:-$HOME/.pm2}"

cd "$DEPLOY_DIR" || fail "Deployment directory is inaccessible: $DEPLOY_DIR"
test "$(pwd -P)" = "$(git rev-parse --show-toplevel)" || fail 'DEPLOY_DIR must be the root of the API Git checkout.'
case "$(git remote get-url origin)" in
  https://github.com/yongyutTG/UserAlfresco-api.git|git@github.com:yongyutTG/UserAlfresco-api.git) ;;
  *) fail 'Unexpected origin URL; expected yongyutTG/UserAlfresco-api.git.' ;;
esac
TRACKED_CHANGES="$(git status --porcelain --untracked-files=no)"
if [[ -n "$TRACKED_CHANGES" ]]; then
  printf 'Tracked changes in %s:\n%s\n' "$DEPLOY_DIR" "$TRACKED_CHANGES"
  fail 'Tracked server files have local changes. Preserve them before deploying (including legacy tracked audit logs; see docs/CI_CD.md).'
fi

echo 'Checking Node.js, npm, PM2 and server environment'
node -e 'if (process.versions.node.split(".")[0] !== "22") { console.error("Node.js 22.x is required"); process.exit(1); }'
npm --version
command -v pm2 >/dev/null || fail 'PM2 must be available to the runner service user.'
command -v curl >/dev/null || fail 'curl is required for the startup check.'
test -r .env || fail "Missing or unreadable server environment: $DEPLOY_DIR/.env"
# mkdir -p backend/logs
# test -w backend/logs || fail 'Runner cannot write backend/logs.'

git fetch origin main
DEPLOY_REVISION="${GITHUB_SHA:-origin/main}"
git merge-base --is-ancestor "$DEPLOY_REVISION" origin/main
if [[ -n "${GITHUB_SHA:-}" && "$(git rev-parse "$DEPLOY_REVISION")" != "$(git rev-parse origin/main)" ]]; then
  echo 'Skipping superseded deployment.'
  exit 0
fi

echo "Deploying revision: $DEPLOY_REVISION"
git reset --hard "$DEPLOY_REVISION"
npm --prefix backend ci --omit=dev
pm2 startOrRestart ecosystem.config.js --only UserAlfresco-api --env production --update-env

# /health depends on Alfresco credentials; / checks local HTTP startup only.
PORT_VALUE="$(node -e 'const c = require("./backend/src/config/env"); process.stdout.write(String(c.port));' | tail -n 1)"
STARTED=false
for attempt in {1..15}; do
  if curl --fail --silent --output /dev/null --max-time 5 "http://127.0.0.1:${PORT_VALUE}/"; then
    STARTED=true
    break
  fi
  sleep 2
done
[[ "$STARTED" == true ]] || fail 'API did not respond after restart. Inspect PM2 logs; no automatic rollback was performed.'
pm2 save
echo "Deployment completed: $(git rev-parse HEAD)"
