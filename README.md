# OpenStream

Self-hosted, open-source multistreaming — the Restream.io alternative you run on your own
cheap VPS. Push **one** RTMP stream to your box; OpenStream fans it out to Twitch, YouTube,
Kick, Facebook, or any custom RTMP/RTMPS endpoint at once. No cloud middleman, no per-channel
fees.

- **Relay-only** (`ffmpeg -c copy`) — near-zero CPU, runs on a $1–5 VPS.
- **MediaMTX** ingest + **one ffmpeg process per destination** → independent auto-restart and
  per-platform health.
- Live **dashboard** to add destinations and watch status, backed by a small Node/TypeScript API.
- **Unified chat** — Twitch + YouTube chats merged into one pane (read-only, no OAuth).
- **Local recording** — every stream saved to your own disk with a size-capped retention
  sweep. No storage fees, no time limits.
- **Event log** — relay drops, reconnects, and ingest state changes at a glance.
- 17 platform presets (Twitch, YouTube, Kick, Facebook, Instagram, X, Trovo, DLive…).

> YouTube chat note: YouTube bot-checks anonymous requests from some datacenter IPs.
> If the chat source stays in "waiting" with a bot-check error, that host's IP is
> flagged — it typically works from home connections and most VPS providers.

## Architecture

```
 OBS ──RTMP──▶ MediaMTX (:1935 ingest, :9997 API)
                  │  publish auth ──▶ backend /internal/mediamtx-auth
                  ▼
        backend polls :9997 /v3/paths/list  (detect publish/unpublish)
                  ├─ ffmpeg -c copy ──▶ Twitch     (supervised, auto-restart)
                  ├─ ffmpeg -c copy ──▶ YouTube
                  └─ ffmpeg -c copy ──▶ custom RTMP/RTMPS
        React dashboard ◀── /api/status ── backend (:3000)
```

## Quick start

```bash
cp .env.example .env
# edit .env — set ADMIN_PASS, INGEST_KEY, SESSION_SECRET
# and a real ENCRYPTION_KEY:  openssl rand -hex 32
docker compose up --build
```

Open http://localhost:3000, log in, add your destinations, then in OBS set:

- **Server:** `rtmp://<your-vps>:1935`
- **Stream Key:** `live?user=<ADMIN_USER>&pass=<INGEST_KEY>`

Hit **Start Streaming** — the dashboard shows each destination going live within a couple
seconds.

## Development

The server and web app can run without Docker (you still need a MediaMTX instance and
`ffmpeg` on PATH):

```bash
cd server && npm install && npm run dev     # API on :3000
cd web    && npm install && npm run dev      # Vite dev server, proxies /api → :3000
```

## Security notes

- Destination stream keys are encrypted at rest (AES-256-GCM) and masked in the UI.
- Publishing requires the ingest key, so your relay can't be hijacked.
- The MediaMTX API is not exposed to the host.
- YouTube/Facebook prefer RTMPS — just use an `rtmps://` destination URL.

## License

MIT
