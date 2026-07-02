import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth";
import { supervisor } from "../relay/supervisor";
import { isIngestActive } from "../mediamtx/poller";
import { recentEvents } from "../events";

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/status", async () => {
    return {
      ingest: {
        live: isIngestActive(),
        path: undefined,
      },
      destinations: supervisor.getStatus(),
    };
  });

  app.get("/api/events", async () => recentEvents());
}
