import { config } from "../config";
import { isIngestLive } from "./api";
import { supervisor } from "../relay/supervisor";
import { applyRecordingConfig, enforceRetention } from "../recording";
import { logEvent } from "../events";

let timer: NodeJS.Timeout | null = null;
let ingestLive = false;
let recordingApplied = false;

async function tick(): Promise<void> {
  try {
    const live = await isIngestLive();

    // First successful contact with MediaMTX: push our recording config into it.
    // Re-done if MediaMTX restarts (contact was lost and this flag reset).
    if (!recordingApplied) {
      await applyRecordingConfig().catch(() => {});
      recordingApplied = true;
    }

    if (live && !ingestLive) {
      ingestLive = true;
      logEvent("info", "ingest live");
      supervisor.onSourceUp();
    } else if (!live && ingestLive) {
      ingestLive = false;
      logEvent("info", "ingest offline");
      supervisor.onSourceDown();
      enforceRetention();
    }
  } catch {
    // MediaMTX unreachable (startup/restart) — retry next tick, re-apply config after.
    recordingApplied = false;
  }
}

export function isIngestActive(): boolean {
  return ingestLive;
}

export function startPoller(): void {
  if (timer) return;
  timer = setInterval(tick, config.pollIntervalMs);
  console.log(`[poller] polling MediaMTX every ${config.pollIntervalMs}ms`);
}

export function stopPoller(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
