import { config } from "../config";
import { isIngestLive } from "./api";
import { supervisor } from "../relay/supervisor";

let timer: NodeJS.Timeout | null = null;
let ingestLive = false;

async function tick(): Promise<void> {
  try {
    const live = await isIngestLive();
    if (live && !ingestLive) {
      ingestLive = true;
      supervisor.onSourceUp();
    } else if (!live && ingestLive) {
      ingestLive = false;
      supervisor.onSourceDown();
    }
  } catch {
    // MediaMTX may be briefly unreachable (startup, restart) — ignore and retry next tick.
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
