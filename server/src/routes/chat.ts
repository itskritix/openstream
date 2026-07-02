import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth";
import { chatManager } from "../chat/manager";
import { ChatMessage } from "../chat/types";
import { createChatSource, deleteChatSource, getChatSource, listChatSources, updateChatSource } from "../db";

const PLATFORMS = new Set(["twitch", "youtube"]);

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/chat-sources", async () =>
    listChatSources().map((s) => ({
      id: s.id,
      platform: s.platform,
      identifier: s.identifier,
      enabled: !!s.enabled,
      ...(chatManager.statusFor(s.id) ?? { status: "stopped", lastError: null }),
    })),
  );

  app.post<{ Body: { platform?: string; identifier?: string } }>("/api/chat-sources", async (req, reply) => {
    const { platform, identifier } = req.body ?? {};
    if (!platform || !PLATFORMS.has(platform) || !identifier?.trim()) {
      return reply.code(400).send({ error: "platform (twitch|youtube) and identifier required" });
    }
    const source = createChatSource(platform, identifier.trim());
    chatManager.sync();
    return reply.code(201).send({ id: source.id, platform, identifier: source.identifier, enabled: true });
  });

  app.post<{ Params: { id: string } }>("/api/chat-sources/:id/toggle", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const existing = getChatSource(id);
    if (!existing) return reply.code(404).send({ error: "not found" });
    const updated = updateChatSource(id, !existing.enabled)!;
    chatManager.sync();
    return { id, enabled: !!updated.enabled };
  });

  app.delete<{ Params: { id: string } }>("/api/chat-sources/:id", async (req, reply) => {
    if (!getChatSource(parseInt(req.params.id, 10))) return reply.code(404).send({ error: "not found" });
    deleteChatSource(parseInt(req.params.id, 10));
    chatManager.sync();
    return reply.code(204).send();
  });

  // SSE feed: backlog on connect, then live messages.
  app.get("/api/chat/stream", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    for (const m of chatManager.recent()) {
      reply.raw.write(`data: ${JSON.stringify(m)}\n\n`);
    }
    const onMessage = (m: ChatMessage) => reply.raw.write(`data: ${JSON.stringify(m)}\n\n`);
    chatManager.on("message", onMessage);
    const keepalive = setInterval(() => reply.raw.write(":ka\n\n"), 25000);
    req.raw.on("close", () => {
      chatManager.off("message", onMessage);
      clearInterval(keepalive);
    });
  });
}
