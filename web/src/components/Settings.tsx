import { useState } from "react";
import { Me } from "../types";

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="copy-field">
      <input className="mono" readOnly value={value} onFocus={(e) => e.target.select()} />
      <button className="small" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// The RTMP server host the browser is talking to (best-effort hint for OBS).
function ingestServer(): string {
  const host = window.location.hostname || "your-vps";
  return `rtmp://${host}:1935`;
}

// The backend ingest path is "live" by default; the OBS stream key must match it.
const INGEST_PATH = "live";

export function Settings({ me }: { me: Me }) {
  const streamKey = `${INGEST_PATH}?user=${me.username}&pass=${me.ingestKey}`;
  return (
    <div className="card">
      <h2>OBS setup</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Point OBS (Settings → Stream → Custom) at your box:
      </p>
      <label>Server</label>
      <CopyField value={ingestServer()} />
      <label>Stream key</label>
      <CopyField value={streamKey} />
      <p className="muted">Then hit “Start Streaming”. Destinations below go live within a couple seconds.</p>
    </div>
  );
}
