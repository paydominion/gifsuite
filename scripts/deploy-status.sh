#!/bin/sh
# Shows what a GifSuite deploy is doing right now. Run: sh scripts/deploy-status.sh
LOG_DIR="${DEPLOY_LOG_DIR:-.deploy-logs}"

echo "── GifSuite deploy status ($(date '+%H:%M:%S')) ──"

if docker info >/dev/null 2>&1; then
  echo "Docker:        running"
else
  echo "Docker:        NOT running (needed only while deploying)"
fi

if pgrep -f "docker-buildx buildx build|docker build" >/dev/null; then
  echo "Image build:   in progress"
elif [ -f "$LOG_DIR/build.log" ]; then
  echo "Image build:   finished"
fi
if [ -f "$LOG_DIR/build.log" ]; then
  echo "  last build steps:"
  grep -E "^#[0-9]+ \[|DONE|ERROR|exporting|naming" "$LOG_DIR/build.log" | tail -4 | sed 's/^/    /'
fi

if pgrep -f "wrangler deploy" >/dev/null; then
  echo "Deploy:        in progress (uploading image / publishing)"
elif [ -f "$LOG_DIR/deploy.log" ]; then
  if grep -q "Deployed" "$LOG_DIR/deploy.log"; then echo "Deploy:        done"; else echo "Deploy:        stopped (see $LOG_DIR/deploy.log)"; fi
fi
if [ -f "$LOG_DIR/deploy.log" ]; then
  echo "  last deploy lines:"
  grep -vE "^\s*$" "$LOG_DIR/deploy.log" | tail -3 | sed 's/^/    /'
fi

code=$(curl -s -m 10 -o /dev/null -w "%{http_code}" https://staging.gifsuite.com/ 2>/dev/null)
echo "Staging site:  https://staging.gifsuite.com → ${code:-no answer}"
echo
echo "Live build output:  tail -f $LOG_DIR/build.log"
echo "Live deploy output: tail -f $LOG_DIR/deploy.log"
