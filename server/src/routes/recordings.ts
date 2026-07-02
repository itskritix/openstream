import fs from "node:fs";
import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth";
import {
  applyRecordingConfig,
  deleteRecording,
  enforceRetention,
  getMaxGb,
  isRecordingEnabled,
  listRecordings,
  recordingPath,
  setMaxGb,
  usedBytes,
} from "../recording";

export async function recordingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/recording", async () => ({
    enabled: isRecordingEnabled(),
    maxGb: getMaxGb(),
    usedBytes: usedBytes(),
    files: listRecordings(),
  }));

  app.post<{ Body: { enabled?: boolean; maxGb?: number } }>("/api/recording", async (req, reply) => {
    const { enabled, maxGb } = req.body ?? {};
    if (maxGb !== undefined) {
      if (typeof maxGb !== "number" || maxGb < 0.1 || maxGb > 10000) {
        return reply.code(400).send({ error: "maxGb must be between 0.1 and 10000" });
      }
      setMaxGb(maxGb);
      enforceRetention();
    }
    try {
      await applyRecordingConfig(enabled);
    } catch (err) {
      return reply.code(502).send({ error: (err as Error).message });
    }
    return { enabled: isRecordingEnabled(), maxGb: getMaxGb(), usedBytes: usedBytes() };
  });

  app.get<{ Params: { file: string } }>("/api/recordings/:file", async (req, reply) => {
    const p = recordingPath(req.params.file);
    if (!p) return reply.code(404).send({ error: "not found" });
    const st = fs.statSync(p);
    reply.header("Content-Type", "video/mp4");
    reply.header("Content-Length", st.size);
    reply.header("Content-Disposition", `attachment; filename="${req.params.file}"`);
    return reply.send(fs.createReadStream(p));
  });

  app.delete<{ Params: { file: string } }>("/api/recordings/:file", async (req, reply) => {
    if (!deleteRecording(req.params.file)) return reply.code(404).send({ error: "not found" });
    return reply.code(204).send();
  });
}
