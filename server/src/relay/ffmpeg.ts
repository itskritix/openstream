import { config } from "../config";

// Join a base RTMP/RTMPS URL with a stream key, tolerating a trailing slash.
export function buildOutputUrl(rtmpUrl: string, streamKey: string): string {
  const base = rtmpUrl.replace(/\/$/, "");
  return `${base}/${streamKey}`;
}

// ffmpeg args for a single relay: pull the local ingest, copy codecs, push to one platform.
// `-progress pipe:1` emits machine-readable key=value stats we parse for the dashboard.
export function buildFfmpegArgs(output: string): string[] {
  const input = `${config.mediamtxRtmp}/${config.ingestPath}`;
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostats",
    // Reconnect flags help ride out brief input hiccups before we fall back to a full restart.
    "-rw_timeout",
    "5000000",
    "-i",
    input,
    "-c",
    "copy",
    "-f",
    "flv",
    output,
    "-progress",
    "pipe:1",
  ];
}

// Parse the `key=value` block ffmpeg writes to -progress into a small stats object.
export interface ProgressStats {
  bitrateKbps?: number;
  fps?: number;
  frames?: number;
  speed?: string;
}

export function parseProgress(chunk: string, into: ProgressStats): void {
  for (const line of chunk.split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    switch (key) {
      case "bitrate": {
        // e.g. "6123.4kbits/s" or "N/A"
        const m = value.match(/([\d.]+)kbits/);
        if (m) into.bitrateKbps = Math.round(parseFloat(m[1]));
        break;
      }
      case "fps": {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) into.fps = n;
        break;
      }
      case "frame": {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n)) into.frames = n;
        break;
      }
      case "speed":
        if (value !== "N/A") into.speed = value;
        break;
    }
  }
}
