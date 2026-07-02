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

export interface RecordingFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface RecordingState {
  enabled: boolean;
  maxGb: number;
  usedBytes: number;
  files: RecordingFile[];
}

export interface ChatMessage {
  platform: "twitch" | "youtube";
  channel: string;
  author: string;
  text: string;
  color?: string;
  ts: string;
}

export interface ChatSourceInfo {
  id: number;
  platform: string;
  identifier: string;
  enabled: boolean;
  status: string;
  lastError: string | null;
}

export interface AppEvent {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
}
