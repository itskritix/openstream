import { EventEmitter } from "node:events";
import { listChatSources, ChatSource } from "../db";
import { ChatMessage, Connector } from "./types";
import { startTwitch } from "./twitch";
import { startYouTube } from "./youtube";
import { logEvent } from "../events";

// Connectors run whenever their source is enabled (not only while ingest is
// live): Twitch's anonymous IRC idles for free, and the YouTube connector
// sleeps in "waiting" until the channel actually goes live.

const BUFFER_SIZE = 200;

class ChatManager extends EventEmitter {
  private connectors = new Map<number, Connector>();
  private buffer: ChatMessage[] = [];

  private onMessage = (m: ChatMessage): void => {
    this.buffer.push(m);
    if (this.buffer.length > BUFFER_SIZE) this.buffer.splice(0, this.buffer.length - BUFFER_SIZE);
    this.emit("message", m);
  };

  recent(): ChatMessage[] {
    return [...this.buffer];
  }

  // Reconcile running connectors with what's enabled in the DB.
  sync(): void {
    const sources = listChatSources().filter((s) => s.enabled);
    const wanted = new Map(sources.map((s) => [s.id, s]));

    for (const [id, conn] of this.connectors) {
      if (!wanted.has(id)) {
        conn.stop();
        this.connectors.delete(id);
      }
    }
    for (const [id, source] of wanted) {
      if (!this.connectors.has(id)) this.start(source);
    }
  }

  private start(source: ChatSource): void {
    logEvent("info", `chat: connecting ${source.platform} "${source.identifier}"`);
    const conn =
      source.platform === "twitch"
        ? startTwitch(source.identifier, this.onMessage)
        : startYouTube(source.identifier, this.onMessage);
    this.connectors.set(source.id, conn);
  }

  statusFor(id: number): { status: string; lastError: string | null } | null {
    const c = this.connectors.get(id);
    return c ? { status: c.status, lastError: c.lastError } : null;
  }

  shutdown(): void {
    for (const conn of this.connectors.values()) conn.stop();
    this.connectors.clear();
  }
}

export const chatManager = new ChatManager();
