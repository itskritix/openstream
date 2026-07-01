#!/usr/bin/env bash
# Run MediaMTX and the OpenStream app in one container (Railway / single-VPS).
# If either process dies, exit non-zero so the platform restarts the container.
set -euo pipefail

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
