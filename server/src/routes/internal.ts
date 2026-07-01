import { FastifyInstance } from "fastify";
import { config } from "../config";
import { safeEqual } from "../crypto";

interface MediaMtxAuth {
  user?: string;
  password?: string;
  action?: string; // "publish" | "read" | "playback" | ...
  path?: string;
  protocol?: string;
  ip?: string;
}

// MediaMTX external HTTP authentication.
// 200 => allowed, anything else => denied. Body is ignored by MediaMTX.
export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: MediaMtxAuth }>("/internal/mediamtx-auth", async (req, reply) => {
    const { action, password } = req.body ?? {};

    // Reads/playback (our local relays pulling the stream) are allowed.
    if (action === "read" || action === "playback") return reply.code(200).send();

    // Publishing requires the ingest key.
    if (action === "publish") {
      if (password && safeEqual(password, config.ingestKey)) return reply.code(200).send();
      req.log.warn({ ip: req.body?.ip }, "rejected publish: bad ingest key");
      return reply.code(401).send({ error: "invalid ingest key" });
    }

    // Anything else: deny by default.
    return reply.code(401).send({ error: "denied" });
  });
}
