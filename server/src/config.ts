function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : fallback;
}

const encryptionKey = required("ENCRYPTION_KEY");
if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32");
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  adminUser: required("ADMIN_USER"),
  adminPass: required("ADMIN_PASS"),
  ingestKey: required("INGEST_KEY"),
  sessionSecret: required("SESSION_SECRET"),
  encryptionKey, // hex string, validated above
  mediamtxApi: optional("MEDIAMTX_API", "http://mediamtx:9997").replace(/\/$/, ""),
  mediamtxRtmp: optional("MEDIAMTX_RTMP", "rtmp://mediamtx:1935").replace(/\/$/, ""),
  ingestPath: optional("INGEST_PATH", "live"),
  dbPath: optional("DB_PATH", "/data/openstream.sqlite"),
  pollIntervalMs: parseInt(optional("POLL_INTERVAL_MS", "1500"), 10),
};

export type Config = typeof config;
