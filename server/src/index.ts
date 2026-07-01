import path from "node:path";
import fs from "node:fs";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { config } from "./config";
import { seedAdmin } from "./db";
import { sessionRoutes } from "./routes/session";
import { destinationRoutes } from "./routes/destinations";
import { statusRoutes } from "./routes/status";
import { internalRoutes } from "./routes/internal";
import { startPoller, stopPoller } from "./mediamtx/poller";
import { supervisor } from "./relay/supervisor";

async function main(): Promise<void> {
  await seedAdmin();

  const app = Fastify({ logger: true });
  await app.register(cookie, { secret: config.sessionSecret });

  await app.register(sessionRoutes);
  await app.register(destinationRoutes);
  await app.register(statusRoutes);
  await app.register(internalRoutes);

  // Serve the built dashboard (SPA) if present.
  const webDir = process.env.WEB_DIR || path.join(__dirname, "../../web/dist");
  if (fs.existsSync(path.join(webDir, "index.html"))) {
    await app.register(fastifyStatic, { root: webDir });
    app.setNotFoundHandler((req, reply) => {
      // API 404s stay JSON; everything else falls back to the SPA entry.
      if (req.raw.url && req.raw.url.startsWith("/api")) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  startPoller();

  const shutdown = async () => {
    stopPoller();
    supervisor.shutdown();
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
