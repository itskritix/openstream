import { FastifyInstance } from "fastify";
import { clearSession, currentUser, setSession, verifyLogin } from "../auth";

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { username?: string; password?: string } }>("/api/login", async (req, reply) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return reply.code(400).send({ error: "username and password required" });
    }
    const user = await verifyLogin(username, password);
    if (!user) return reply.code(401).send({ error: "invalid credentials" });
    setSession(reply, user.id);
    return { username: user.username };
  });

  app.post("/api/logout", async (_req, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  app.get("/api/me", async (req, reply) => {
    const user = currentUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { username: user.username, ingestKey: user.ingest_key };
  });
}
