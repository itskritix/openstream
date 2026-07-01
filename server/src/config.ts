import path from "node:path";
import { resolveSecrets } from "./secrets";

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : fallback;
}

const dbPath = optional("DB_PATH", "/data/openstream.sqlite");

// Secrets: env vars if provided, otherwise generated once and saved next to the DB.
// The only thing a user needs to set is ADMIN_USER / ADMIN_PASS (and even those
// fall back to "admin" + a generated password printed to the logs on first boot).
const secrets = resolveSecrets(path.dirname(dbPath));

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  adminUser: secrets.adminUser,
  adminPass: secrets.adminPass,
  ingestKey: secrets.ingestKey,
  sessionSecret: secrets.sessionSecret,
  encryptionKey: secrets.encryptionKey,
  mediamtxApi: optional("MEDIAMTX_API", "http://mediamtx:9997").replace(/\/$/, ""),
  mediamtxRtmp: optional("MEDIAMTX_RTMP", "rtmp://mediamtx:1935").replace(/\/$/, ""),
  ingestPath: optional("INGEST_PATH", "live"),
  dbPath,
  pollIntervalMs: parseInt(optional("POLL_INTERVAL_MS", "1500"), 10),
  generatedSecrets: secrets.generated,
};

export type Config = typeof config;
