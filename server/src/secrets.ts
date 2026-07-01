import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Secrets can come from env vars (advanced users), but if they're absent we
// generate them once and persist to the data volume. Result: zero required
// config for a basic deploy.

export interface ResolvedSecrets {
  adminUser: string;
  adminPass: string;
  ingestKey: string;
  sessionSecret: string;
  encryptionKey: string; // 64 hex chars
  generated: string[]; // names of secrets newly generated this boot
}

const isHex64 = (v: string) => /^[0-9a-fA-F]{64}$/.test(v);
const genHex = (bytes: number) => crypto.randomBytes(bytes).toString("hex");
const genToken = (bytes: number) => crypto.randomBytes(bytes).toString("base64url");

export function resolveSecrets(dataDir: string): ResolvedSecrets {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "secrets.json");

  let stored: Record<string, string> = {};
  if (fs.existsSync(file)) {
    try {
      stored = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      /* corrupt file — treat as empty, we'll rewrite */
    }
  }

  const generated: string[] = [];

  // env wins; then persisted value; then generate + persist.
  function resolve(name: string, gen: () => string, validate?: (v: string) => boolean): string {
    const env = process.env[name]?.trim();
    if (env) {
      if (validate && !validate(env)) {
        throw new Error(`Env var ${name} is set but invalid`);
      }
      return env;
    }
    if (stored[name] && (!validate || validate(stored[name]))) return stored[name];
    const v = gen();
    stored[name] = v;
    generated.push(name);
    return v;
  }

  const adminUser = process.env.ADMIN_USER?.trim() || stored.ADMIN_USER || "admin";
  stored.ADMIN_USER = adminUser;

  const adminPass = resolve("ADMIN_PASS", () => genToken(9)); // ~12 char password
  const ingestKey = resolve("INGEST_KEY", () => genToken(18));
  const sessionSecret = resolve("SESSION_SECRET", () => genHex(32));
  const encryptionKey = resolve(
    "ENCRYPTION_KEY",
    () => genHex(32),
    isHex64, // must be 32 bytes; reject a bad env value rather than silently replace
  );

  fs.writeFileSync(file, JSON.stringify(stored, null, 2), { mode: 0o600 });

  return { adminUser, adminPass, ingestKey, sessionSecret, encryptionKey, generated };
}
