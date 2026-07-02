import { spawn, ChildProcess } from "node:child_process";
import { getAdmin, getDestination, listEnabledDestinations, Destination } from "../db";
import { decrypt } from "../crypto";
import { buildFfmpegArgs, buildOutputUrl, parseProgress, ProgressStats } from "./ffmpeg";
import { logEvent } from "../events";

export type RelayStatus = "starting" | "live" | "reconnecting" | "error" | "stopped";

interface Relay {
  destId: number;
  name: string;
  platform: string;
  proc: ChildProcess | null;
  status: RelayStatus;
  restarts: number;
  lastError: string | null;
  stats: ProgressStats;
  backoffMs: number;
  stopping: boolean;
  restartTimer: NodeJS.Timeout | null;
}

const MIN_BACKOFF = 1000;
const MAX_BACKOFF = 30000;

class Supervisor {
  private relays = new Map<number, Relay>();
  private sourceLive = false;

  isSourceLive(): boolean {
    return this.sourceLive;
  }

  // Called by the poller when the ingest path appears / disappears.
  onSourceUp(): void {
    if (this.sourceLive) return;
    this.sourceLive = true;
    console.log("[supervisor] ingest live — starting relays");
    this.startAll();
  }

  onSourceDown(): void {
    if (!this.sourceLive) return;
    this.sourceLive = false;
    console.log("[supervisor] ingest offline — stopping relays");
    this.stopAll();
  }

  private startAll(): void {
    const admin = getAdmin();
    for (const dest of listEnabledDestinations(admin.id)) {
      this.startRelay(dest);
    }
  }

  private stopAll(): void {
    for (const id of [...this.relays.keys()]) {
      this.stopRelay(id);
    }
  }

  // Public: react to a destination being enabled/disabled or deleted while live.
  onDestinationEnabled(destId: number): void {
    if (!this.sourceLive) return;
    const dest = getDestination(destId);
    if (dest && dest.enabled) this.startRelay(dest);
  }

  onDestinationDisabled(destId: number): void {
    this.stopRelay(destId);
  }

  private startRelay(dest: Destination): void {
    if (this.relays.has(dest.id)) return; // already running

    const relay: Relay = {
      destId: dest.id,
      name: dest.name,
      platform: dest.platform,
      proc: null,
      status: "starting",
      restarts: 0,
      lastError: null,
      stats: {},
      backoffMs: MIN_BACKOFF,
      stopping: false,
      restartTimer: null,
    };
    this.relays.set(dest.id, relay);
    this.spawnProc(relay);
  }

  private spawnProc(relay: Relay): void {
    let output: string;
    try {
      const dest = getDestination(relay.destId);
      if (!dest) {
        this.stopRelay(relay.destId);
        return;
      }
      output = buildOutputUrl(dest.rtmp_url, decrypt(dest.stream_key_enc));
    } catch (err) {
      relay.status = "error";
      relay.lastError = `config: ${(err as Error).message}`;
      return;
    }

    relay.status = "starting";
    relay.stats = {};
    const proc = spawn("ffmpeg", buildFfmpegArgs(output), { stdio: ["ignore", "pipe", "pipe"] });
    relay.proc = proc;

    proc.stdout.on("data", (buf: Buffer) => {
      // First progress block means we're connected and pushing — mark live, reset backoff.
      if (relay.status !== "live") {
        relay.status = "live";
        relay.backoffMs = MIN_BACKOFF;
        logEvent("info", `relay "${relay.name}" live`);
      }
      parseProgress(buf.toString(), relay.stats);
    });

    proc.stderr.on("data", (buf: Buffer) => {
      relay.lastError = buf.toString().trim().split("\n").slice(-1)[0] || relay.lastError;
    });

    proc.on("exit", (code, signal) => {
      relay.proc = null;
      if (relay.stopping || !this.sourceLive) {
        relay.status = "stopped";
        return;
      }
      // Unexpected exit — schedule a restart with backoff.
      relay.status = "reconnecting";
      relay.restarts += 1;
      if (code !== 0 && !relay.lastError) relay.lastError = `ffmpeg exited (code ${code}, signal ${signal})`;
      const delay = relay.backoffMs;
      relay.backoffMs = Math.min(relay.backoffMs * 2, MAX_BACKOFF);
      logEvent("warn", `relay "${relay.name}" dropped (${relay.lastError ?? "unknown"}), retry in ${Math.round(delay / 1000)}s`);
      relay.restartTimer = setTimeout(() => {
        relay.restartTimer = null;
        if (!relay.stopping && this.sourceLive) this.spawnProc(relay);
      }, delay);
    });

    proc.on("error", (err) => {
      relay.lastError = err.message;
      relay.status = "error";
    });
  }

  private stopRelay(destId: number): void {
    const relay = this.relays.get(destId);
    if (!relay) return;
    relay.stopping = true;
    if (relay.restartTimer) clearTimeout(relay.restartTimer);
    if (relay.proc) {
      relay.proc.kill("SIGTERM");
      const proc = relay.proc;
      setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 3000);
    }
    this.relays.delete(destId);
  }

  getStatus(): Array<{
    destId: number;
    name: string;
    platform: string;
    status: RelayStatus;
    restarts: number;
    lastError: string | null;
    bitrateKbps?: number;
    fps?: number;
  }> {
    return [...this.relays.values()].map((r) => ({
      destId: r.destId,
      name: r.name,
      platform: r.platform,
      status: r.status,
      restarts: r.restarts,
      lastError: r.lastError,
      bitrateKbps: r.stats.bitrateKbps,
      fps: r.stats.fps,
    }));
  }

  shutdown(): void {
    this.stopAll();
  }
}

export const supervisor = new Supervisor();
