import { FastifyInstance } from "fastify";
import { User } from "../db";
import { requireAuth } from "../auth";
import {
  createDestination,
  deleteDestination,
  Destination,
  getDestination,
  listDestinations,
  updateDestination,
} from "../db";
import { decrypt, encrypt } from "../crypto";
import { supervisor } from "../relay/supervisor";

function maskKey(enc: string): string {
  try {
    const key = decrypt(enc);
    if (key.length <= 4) return "••••";
    return "••••" + key.slice(-4);
  } catch {
    return "••••";
  }
}

function serialize(d: Destination) {
  return {
    id: d.id,
    name: d.name,
    platform: d.platform,
    rtmpUrl: d.rtmp_url,
    keyMasked: maskKey(d.stream_key_enc),
    enabled: !!d.enabled,
  };
}

interface DestBody {
  name?: string;
  platform?: string;
  rtmpUrl?: string;
  streamKey?: string;
  enabled?: boolean;
}

export async function destinationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/destinations", async (req) => {
    const user = (req as typeof req & { user: User }).user;
    return listDestinations(user.id).map(serialize);
  });

  app.post<{ Body: DestBody }>("/api/destinations", async (req, reply) => {
    const user = (req as typeof req & { user: User }).user;
    const { name, platform, rtmpUrl, streamKey, enabled } = req.body ?? {};
    if (!name || !platform || !rtmpUrl || !streamKey) {
      return reply.code(400).send({ error: "name, platform, rtmpUrl and streamKey are required" });
    }
    const dest = createDestination({
      userId: user.id,
      name,
      platform,
      rtmpUrl,
      streamKeyEnc: encrypt(streamKey),
      enabled: enabled !== false,
    });
    if (dest.enabled) supervisor.onDestinationEnabled(dest.id);
    return reply.code(201).send(serialize(dest));
  });

  app.patch<{ Params: { id: string }; Body: DestBody }>("/api/destinations/:id", async (req, reply) => {
    const user = (req as typeof req & { user: User }).user;
    const id = parseInt(req.params.id, 10);
    const existing = getDestination(id);
    if (!existing || existing.user_id !== user.id) return reply.code(404).send({ error: "not found" });

    const { name, platform, rtmpUrl, streamKey, enabled } = req.body ?? {};
    const updated = updateDestination(id, {
      name,
      platform,
      rtmpUrl,
      streamKeyEnc: streamKey ? encrypt(streamKey) : undefined,
      enabled,
    })!;

    // Apply relay changes live: restart cleanly on any edit.
    supervisor.onDestinationDisabled(id);
    if (updated.enabled) supervisor.onDestinationEnabled(id);

    return serialize(updated);
  });

  app.post<{ Params: { id: string } }>("/api/destinations/:id/toggle", async (req, reply) => {
    const user = (req as typeof req & { user: User }).user;
    const id = parseInt(req.params.id, 10);
    const existing = getDestination(id);
    if (!existing || existing.user_id !== user.id) return reply.code(404).send({ error: "not found" });

    const updated = updateDestination(id, { enabled: !existing.enabled })!;
    if (updated.enabled) supervisor.onDestinationEnabled(id);
    else supervisor.onDestinationDisabled(id);
    return serialize(updated);
  });

  app.delete<{ Params: { id: string } }>("/api/destinations/:id", async (req, reply) => {
    const user = (req as typeof req & { user: User }).user;
    const id = parseInt(req.params.id, 10);
    const existing = getDestination(id);
    if (!existing || existing.user_id !== user.id) return reply.code(404).send({ error: "not found" });
    supervisor.onDestinationDisabled(id);
    deleteDestination(id);
    return reply.code(204).send();
  });
}
