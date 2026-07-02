# Deploying OpenStream to Railway

> ⚠️ **Status: partially verified.** The dashboard + app boot has been confirmed on
> Railway, but **RTMP ingest through Railway's TCP Proxy has not been end-to-end
> tested yet** — it should work in principle, but until someone streams through it,
> treat this path as experimental. A plain VPS (open port 1935 in the firewall) is the
> verified deployment path.

Railway runs OpenStream as **one all-in-one service** (MediaMTX + app in a single
container, talking over `localhost`). This sidesteps Railway's IPv6 private-networking
quirks and needs just one HTTP domain + one TCP proxy.

Built from `Dockerfile.railway` (wired up automatically by `railway.json`).

## 1. Get the code on GitHub

Railway deploys from a repo:

```bash
git init && git add -A && git commit -m "openstream mvp"
gh repo create openstream --private --source=. --push   # or push to a repo you made
```

## 2. Create the Railway service

1. Railway → **New Project → Deploy from GitHub repo** → pick `openstream`.
2. Railway reads `railway.json` and builds with `Dockerfile.railway`. (If it doesn't:
   Service → **Settings → Build → Dockerfile Path** = `Dockerfile.railway`.)

## 3. Variables

Service → **Variables** → add just these two:

| Key | Value |
| --- | --- |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | *a strong password* |

That's it. Everything else (ingest key, session secret, encryption key, port,
MediaMTX wiring) is baked into the image or **auto-generated on first boot** and saved
to the `/data` volume. The generated ingest key is shown on the dashboard's OBS panel
(and printed once in the deploy logs).

> If you don't even set `ADMIN_USER`/`ADMIN_PASS`, it defaults to `admin` + a random
> password printed in the deploy logs on first boot.

## 4. Volume (so destinations survive redeploys)

Service → **Settings → Volumes** → add a volume mounted at **`/data`**.

## 5. Networking

Service → **Settings → Networking**:

- **Public Networking → Generate Domain** → this is your dashboard URL (targets port `3000`).
- **TCP Proxy → add proxy for port `1935`** → Railway gives you a host + port like
  `roundhouse.proxy.rlwy.net:23456`. This is your RTMP ingest endpoint.

## 6. Deploy & log in

Trigger a deploy. Open the generated domain, log in with `ADMIN_USER` / `ADMIN_PASS`,
and add your destinations.

## 7. Point OBS at it

OBS → Settings → Stream → **Custom**:

- **Server:** `rtmp://roundhouse.proxy.rlwy.net:23456`  ← your TCP proxy host:port
- **Stream Key:** `live?user=admin&pass=<INGEST_KEY>`

Start Streaming — destinations should flip to **Live** on the dashboard within a couple
seconds.

## Verify checklist

- [ ] Dashboard loads over the Railway domain, login works
- [ ] Add a test destination (e.g. a personal YouTube "Stream now" key)
- [ ] OBS connects via the TCP proxy; dashboard header shows **ingest live**
- [ ] The destination card goes **Live**; the platform shows the incoming feed
- [ ] Disable one destination mid-stream → it stops, others keep running
- [ ] Stop OBS → all relays stop, ingest shows offline

## Caveats on Railway

- **TCP Proxy for RTMP is unverified:** the proxy forwards raw TCP so RTMP *should*
  pass through, but this hasn't been confirmed with a real OBS → Railway → platform
  stream yet. If it fails for you, use a VPS with port 1935 open instead.
- **Bandwidth:** multistreaming is egress-heavy (each destination = a full copy out).
  Railway bills egress — watch usage, this is where a cheap VPS is often cheaper.
- **Single container:** MediaMTX + app share one box here. Fine for personal use; if one
  crashes the container restarts (both come back together).
- Prefer `rtmps://` destination URLs for YouTube/Facebook.
