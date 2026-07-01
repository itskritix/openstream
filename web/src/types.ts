export interface Destination {
  id: number;
  name: string;
  platform: string;
  rtmpUrl: string;
  keyMasked: string;
  enabled: boolean;
}

export type RelayStatus = "starting" | "live" | "reconnecting" | "error" | "stopped";

export interface RelayState {
  destId: number;
  name: string;
  platform: string;
  status: RelayStatus;
  restarts: number;
  lastError: string | null;
  bitrateKbps?: number;
  fps?: number;
}

export interface Status {
  ingest: { live: boolean };
  destinations: RelayState[];
}

export interface Me {
  username: string;
  ingestKey: string;
}
