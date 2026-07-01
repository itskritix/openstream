#!/usr/bin/env bash
# Run MediaMTX and the OpenStream app in one container (Railway / single-VPS).
# If either process dies, exit non-zero so the platform restarts the container.
set -euo pipefail

# Force the app port to 3000 regardless of any PORT the platform injects —
# MediaMTX's auth webhook is hardcoded to localhost:3000. Point the public
# domain at 3000 when generating it.
export PORT=3000

echo "[start] launching MediaMTX…"
mediamtx /app/mediamtx.yml &
MTX_PID=$!

echo "[start] launching OpenStream app…"
node /app/dist/index.js &
APP_PID=$!

# Wait for whichever exits first, then tear down the other.
wait -n "$MTX_PID" "$APP_PID"
echo "[start] a process exited — shutting down"
kill "$MTX_PID" "$APP_PID" 2>/dev/null || true
exit 1
