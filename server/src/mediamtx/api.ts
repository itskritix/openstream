import { config } from "../config";

interface PathItem {
  name: string;
  ready: boolean;
  source: { type: string } | null;
}

interface PathList {
  itemCount: number;
  items: PathItem[];
}

// Returns the names of paths that currently have a live publisher.
export async function listReadyPaths(): Promise<string[]> {
  const res = await fetch(`${config.mediamtxApi}/v3/paths/list`);
  if (!res.ok) throw new Error(`MediaMTX API ${res.status}`);
  const data = (await res.json()) as PathList;
  return data.items.filter((p) => p.ready).map((p) => p.name);
}

// Is the configured ingest path live right now?
export async function isIngestLive(): Promise<boolean> {
  const ready = await listReadyPaths();
  return ready.includes(config.ingestPath);
}
