export interface ChatMessage {
  platform: "twitch" | "youtube";
  channel: string;
  author: string;
  text: string;
  color?: string;
  ts: string;
}

export type ConnectorStatus = "connected" | "connecting" | "waiting" | "error";

export interface Connector {
  status: ConnectorStatus;
  lastError: string | null;
  stop(): void;
}
