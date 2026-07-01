import { FastifyReply, FastifyRequest } from "fastify";
import argon2 from "argon2";
import { getAdmin, getUserById, User } from "./db";

const COOKIE = "openstream_session";

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const admin = getAdmin();
  if (username !== admin.username) return null;
  const ok = await argon2.verify(admin.password_hash, password).catch(() => false);
  return ok ? admin : null;
}

export function setSession(reply: FastifyReply, userId: number): void {
  reply.setCookie(COOKIE, String(userId), {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(COOKIE, { path: "/" });
}

export function currentUser(req: FastifyRequest): User | null {
  const raw = req.cookies[COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const id = parseInt(unsigned.value, 10);
  if (Number.isNaN(id)) return null;
  return getUserById(id) ?? null;
}

// Guard for protected routes. Attaches req.user or replies 401.
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = currentUser(req);
  if (!user) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  (req as FastifyRequest & { user: User }).user = user;
}
