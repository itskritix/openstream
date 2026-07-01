import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import argon2 from "argon2";
import { config } from "./config";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  ingest_key: string;
  created_at: string;
}

export interface Destination {
  id: number;
  user_id: number;
  name: string;
  platform: string;
  rtmp_url: string;
  stream_key_enc: string;
  enabled: number; // 0 | 1
  created_at: string;
}

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    ingest_key    TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    platform       TEXT NOT NULL,
    rtmp_url       TEXT NOT NULL,
    stream_key_enc TEXT NOT NULL,
    enabled        INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed / reconcile the single admin user from env on every boot.
export async function seedAdmin(): Promise<void> {
  const hash = await argon2.hash(config.adminPass);
  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(config.adminUser) as
    | User
    | undefined;
  if (existing) {
    // Keep password + ingest key in sync with env (env is the source of truth for MVP).
    db.prepare("UPDATE users SET password_hash = ?, ingest_key = ? WHERE id = ?").run(
      hash,
      config.ingestKey,
      existing.id,
    );
  } else {
    db.prepare("INSERT INTO users (username, password_hash, ingest_key) VALUES (?, ?, ?)").run(
      config.adminUser,
      hash,
      config.ingestKey,
    );
  }
}

export function getAdmin(): User {
  const u = db.prepare("SELECT * FROM users WHERE username = ?").get(config.adminUser) as
    | User
    | undefined;
  if (!u) throw new Error("Admin user not seeded");
  return u;
}

export function getUserById(id: number): User | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function listDestinations(userId: number): Destination[] {
  return db
    .prepare("SELECT * FROM destinations WHERE user_id = ? ORDER BY id ASC")
    .all(userId) as Destination[];
}

export function listEnabledDestinations(userId: number): Destination[] {
  return db
    .prepare("SELECT * FROM destinations WHERE user_id = ? AND enabled = 1 ORDER BY id ASC")
    .all(userId) as Destination[];
}

export function getDestination(id: number): Destination | undefined {
  return db.prepare("SELECT * FROM destinations WHERE id = ?").get(id) as Destination | undefined;
}

export function createDestination(d: {
  userId: number;
  name: string;
  platform: string;
  rtmpUrl: string;
  streamKeyEnc: string;
  enabled: boolean;
}): Destination {
  const info = db
    .prepare(
      "INSERT INTO destinations (user_id, name, platform, rtmp_url, stream_key_enc, enabled) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(d.userId, d.name, d.platform, d.rtmpUrl, d.streamKeyEnc, d.enabled ? 1 : 0);
  return getDestination(Number(info.lastInsertRowid))!;
}

export function updateDestination(
  id: number,
  fields: { name?: string; platform?: string; rtmpUrl?: string; streamKeyEnc?: string; enabled?: boolean },
): Destination | undefined {
  const current = getDestination(id);
  if (!current) return undefined;
  db.prepare(
    "UPDATE destinations SET name = ?, platform = ?, rtmp_url = ?, stream_key_enc = ?, enabled = ? WHERE id = ?",
  ).run(
    fields.name ?? current.name,
    fields.platform ?? current.platform,
    fields.rtmpUrl ?? current.rtmp_url,
    fields.streamKeyEnc ?? current.stream_key_enc,
    fields.enabled === undefined ? current.enabled : fields.enabled ? 1 : 0,
    id,
  );
  return getDestination(id);
}

export function deleteDestination(id: number): void {
  db.prepare("DELETE FROM destinations WHERE id = ?").run(id);
}
