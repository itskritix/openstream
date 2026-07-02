# OpenStream — Phase 2 Plan

## Context

MVP is built and verified end-to-end (OBS → ingest → auth → fan-out → YouTube live).
Research on Restream reviews shows what users love most: one-click multistreaming
(we have it), **unified chat** (their stickiest feature), **recording** (they paywall
storage), and platform templates. Their most-hated trait: paywalls on everything.

Phase 2 goal: ship the two highest-value features that are feasible on a $5 VPS —
**local recording** and **read-only unified chat** — plus close the testing gaps.

Explicitly out of scope: browser Studio (huge WebRTC project, OBS users don't need it),
AI clips (needs GPU, breaks the cheap-VPS promise), analytics (later).

---

## Milestone 1 — Verification pass (no new features)

Close the gaps before building on top. In order:

1. **Multi-destination fan-out** — stream with 2–3 destinations enabled (YouTube +
   local RTMP sink is enough). Verify independent relays; kill one destination's
   endpoint mid-stream → others stay live, victim shows `reconnecting` with backoff.
2. **Streamer reconnect** — stop/start OBS mid-session; relays must tear down and
   respawn cleanly (poller idempotency under churn).
3. **RTMPS destination** — one relay to an `rtmps://` URL (YouTube RTMPS endpoint
   works for this).
4. **Dashboard click-through** — real browser: login → add destination → toggle →
   watch status flip live → delete.
5. **Railway TCP proxy** — add proxy on 1935 to the existing deploy, repeat the OBS
   test against it. If it passes, flip RAILWAY.md from "experimental" to "verified";
   also confirm `/data` volume persistence across a redeploy.
6. **Long-run soak** — 1h+ stream, watch relay memory/CPU and restart counts.

Fix whatever falls out. These are bug-hunts, not features.

## Milestone 2 — Local recording

Restream charges for recording storage; ours is the user's own disk.

**Approach: use MediaMTX's native recording** — zero new processes, battle-tested
segmenting. No extra ffmpeg.

- `mediamtx.yml`: on the `live` path set `record: yes`,
  `recordPath: /data/recordings/%Y-%m-%d_%H-%M-%S-%f`, `recordFormat: fmp4`,
  `recordSegmentDuration: 1h` → playable .mp4 segments per stream session.
- Recording toggle: dashboard switch that PATCHes the path config via the MediaMTX
  control API (`/v3/config/paths/patch/live`) so it flips at runtime, persisted as a
  user setting in SQLite.
- Backend `routes/recordings.ts`:
  - `GET /api/recordings` — list files (name, size, date, duration via ffprobe)
  - `GET /api/recordings/:file` — download (stream from disk, auth required)
  - `DELETE /api/recordings/:file` — delete
- **Retention guard** (critical on small VPSes): setting for max total GB (default ~5);
  on each new recording, delete oldest until under the cap. Show disk usage in UI.
- Web: Recordings page — table + download/delete buttons + disk usage bar.

## Milestone 3 — Unified chat (read-only)

The #1 most-praised Restream feature. Read-only merged chat solves the real pain
(watching N chats at once); replying can come later.

**Architecture**

```
server/src/chat/
  types.ts       ChatMessage { platform, channel, author, text, color?, ts }
  manager.ts     starts/stops connectors; ring buffer of last ~200 messages
  twitch.ts      anonymous IRC (justinfan nick) over TCP/WebSocket — no auth needed
  youtube.ts     InnerTube live-chat polling (public streams, no API key)
  kick.ts        Pusher WebSocket (unofficial, public) — stretch
routes/chat.ts   GET /api/chat/stream — SSE feed + recent backlog on connect
web:             ChatPane on the dashboard — merged feed, platform badge per message
```

- **New table `chat_sources`** `(id, platform, identifier, enabled)` — e.g.
  `twitch` + channel name, `youtube` + channel/video URL. Separate from destinations
  because a destination's stream key ≠ chat identity.
- Connectors run only while ingest is live (start on `onSourceUp`, stop on down) to
  avoid idle connections.
- Delivery order: **Twitch first** (trivial, anonymous IRC), **YouTube second**
  (InnerTube polling like chat-downloader; no OAuth for public chat), **Kick stretch**.
- Resilience: each connector auto-reconnects with backoff, surfaces status in
  `/api/status` (chat: connected/reconnecting per source).
- UI: right-hand chat column on the dashboard, colored platform badges, auto-scroll
  with pause-on-hover.

## Milestone 4 — Polish sweep

- **Expand platform templates** — grow `web/src/platforms.ts` from 7 to ~25+
  (Rumble, DLive, X/Twitter, Instagram via RTMPS bridges, Odysee, Brime, etc.).
  Pure data entry; verify each URL from platform docs.
- **Event log** — in-memory ring of relay lifecycle events (started, reconnected,
  gave-up, ingest up/down) + `GET /api/events` + simple log panel in UI. Turns
  "why did it drop?" from log-diving into a glance.
- **README refresh** — screenshots, feature comparison table vs Restream free tier
  (unlimited destinations, no watermark, recording included, chat included).

---

## Order & rationale

M1 → M2 → M3 → M4. Verification first (don't build chat on an unproven relay core),
recording second (small, self-contained, instant user value), chat third (biggest
feature, most new surface area), polish last (cheap wins that market the project).

## Verification per milestone

- M2: stream 5 min → file appears, plays in VLC, downloads via UI, retention deletes
  oldest when cap exceeded.
- M3: live stream with Twitch + YouTube chat sources → messages from both appear
  merged within ~2s (Twitch) / ~5s (YouTube); kill network → reconnects.
- M4: each new template tested syntactically (URL shape), top 5 tested live.
