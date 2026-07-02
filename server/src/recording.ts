import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { getSetting, setSetting } from "./db";

// Recording uses MediaMTX's native recorder (no extra ffmpeg): we PATCH the
// `live` path config at runtime. Files land next to the DB on the data volume.

export const recordingsDir = path.join(path.dirname(config.dbPath), "recordings");

export function isRecordingEnabled(): boolean {
  return getSetting("recording_enabled", "false") === "true";
}

export function getMaxGb(): number {
  return parseFloat(getSetting("recording_max_gb", "5"));
}

export function setMaxGb(gb: number): void {
  setSetting("recording_max_gb", String(gb));
}

// Push the current recording state into MediaMTX. Safe to call repeatedly.
export async function applyRecordingConfig(enabled?: boolean): Promise<void> {
  if (enabled !== undefined) setSetting("recording_enabled", String(enabled));
  fs.mkdirSync(recordingsDir, { recursive: true });
  const body = {
    record: isRecordingEnabled(),
    // MediaMTX requires %path in the pattern; it expands to the path name ("live").
    recordPath: path.join(recordingsDir, "%path_%Y-%m-%d_%H-%M-%S-%f"),
    recordFormat: "fmp4",
    recordDeleteAfter: "0s", // retention is ours, not MediaMTX's
  };
  const res = await fetch(`${config.mediamtxApi}/v3/config/paths/patch/${config.ingestPath}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MediaMTX patch failed: ${res.status}`);
}

export interface RecordingFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

const SAFE_NAME = /^[\w.-]+\.mp4$/;

export function listRecordings(): RecordingFile[] {
  if (!fs.existsSync(recordingsDir)) return [];
  return fs
    .readdirSync(recordingsDir)
    .filter((f) => SAFE_NAME.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(recordingsDir, f));
      return { name: f, sizeBytes: st.size, modifiedAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export function recordingPath(name: string): string | null {
  if (!SAFE_NAME.test(name)) return null;
  const p = path.join(recordingsDir, name);
  return fs.existsSync(p) ? p : null;
}

export function deleteRecording(name: string): boolean {
  const p = recordingPath(name);
  if (!p) return false;
  fs.unlinkSync(p);
  return true;
}

export function usedBytes(): number {
  return listRecordings().reduce((sum, r) => sum + r.sizeBytes, 0);
}

// Delete oldest recordings until total size fits under the cap.
export function enforceRetention(): { deleted: string[] } {
  const capBytes = getMaxGb() * 1024 ** 3;
  const files = listRecordings(); // newest first
  let total = files.reduce((s, f) => s + f.sizeBytes, 0);
  const deleted: string[] = [];
  for (let i = files.length - 1; i >= 0 && total > capBytes; i--) {
    const f = files[i];
    try {
      fs.unlinkSync(path.join(recordingsDir, f.name));
      total -= f.sizeBytes;
      deleted.push(f.name);
    } catch {
      /* file may be mid-write; skip */
    }
  }
  if (deleted.length) console.log(`[recording] retention deleted: ${deleted.join(", ")}`);
  return { deleted };
}
