import { useState } from "react";
import { api } from "../api";
import { PLATFORMS } from "../platforms";

export function DestinationForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const [name, setName] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState(PLATFORMS[0].rtmpUrl);
  const [streamKey, setStreamKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickPlatform(id: string) {
    setPlatform(id);
    const tpl = PLATFORMS.find((p) => p.id === id);
    if (tpl) {
      setRtmpUrl(tpl.rtmpUrl);
      if (!name) setName(tpl.label);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const label = PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
      await api.createDestination({
        name: name || label,
        platform,
        rtmpUrl,
        streamKey,
        enabled: true,
      });
      setName("");
      setStreamKey("");
      setOpen(false);
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="primary" onClick={() => setOpen(true)}>
        + Add destination
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>New destination</h2>
      <label>Platform</label>
      <select value={platform} onChange={(e) => pickPlatform(e.target.value)}>
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Twitch" />

      <label>RTMP / RTMPS URL</label>
      <input
        className="mono"
        value={rtmpUrl}
        onChange={(e) => setRtmpUrl(e.target.value)}
        placeholder="rtmp://…"
      />

      <label>Stream key</label>
      <input
        type="password"
        value={streamKey}
        onChange={(e) => setStreamKey(e.target.value)}
        placeholder="paste the platform stream key"
      />

      {error && <div className="error-text">{error}</div>}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Adding…" : "Add destination"}
        </button>
      </div>
    </form>
  );
}
