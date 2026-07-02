import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { RecordingState } from "../types";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function RecordingsPanel() {
  const [state, setState] = useState<RecordingState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api.recording());
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (!state) return null;

  async function toggle() {
    setBusy(true);
    try {
      setState(await api.setRecording({ enabled: !state!.enabled }));
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: string) {
    if (!confirm(`Delete ${file}?`)) return;
    await api.deleteRecording(file);
    await load();
  }

  const capBytes = state.maxGb * 1024 ** 3;
  const pct = Math.min(100, Math.round((state.usedBytes / capBytes) * 100));

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Recordings</h2>
        <div className="switch">
          <span className="muted">{state.enabled ? "Recording on" : "Recording off"}</span>
          <button className="small" onClick={toggle} disabled={busy}>
            {state.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
      <div className="muted" style={{ marginBottom: 10 }}>
        {fmtSize(state.usedBytes)} of {state.maxGb} GB cap ({pct}%) — oldest are auto-deleted past the cap
      </div>

      {state.files.length === 0 && (
        <p className="muted">No recordings yet. Enable recording and go live — each session lands here as .mp4.</p>
      )}
      {state.files.map((f) => (
        <div className="dest" key={f.name}>
          <div className="grow">
            <div className="mono">{f.name}</div>
            <div className="muted">
              {fmtSize(f.sizeBytes)} · {new Date(f.modifiedAt).toLocaleString()}
            </div>
          </div>
          <div className="actions">
            <a href={`/api/recordings/${encodeURIComponent(f.name)}`} download>
              <button className="small">Download</button>
            </a>
            <button className="small danger" onClick={() => remove(f.name)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
