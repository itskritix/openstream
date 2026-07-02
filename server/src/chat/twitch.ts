import tls from "node:tls";
import { ChatMessage, Connector } from "./types";

// Anonymous Twitch IRC: the justinfan<digits> nick is Twitch's official
// read-only guest access — no OAuth, no registration.

const HOST = "irc.chat.twitch.tv";
const PORT = 6697;

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) tags[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return tags;
}

export function startTwitch(
  channel: string,
  onMessage: (m: ChatMessage) => void,
): Connector {
  const chan = channel.toLowerCase().replace(/^#/, "").trim();
  let socket: tls.TLSSocket | null = null;
  let stopped = false;
  let backoff = 1000;
  let reconnectTimer: NodeJS.Timeout | null = null;

  const state: Connector = {
    status: "connecting",
    lastError: null,
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.destroy();
    },
  };

  function connect(): void {
    if (stopped) return;
    state.status = "connecting";
    let buffer = "";
    // Twitch's IRC edge presents a *.twitchircedge.twitch.a2z.com cert that doesn't
    // list irc.chat.twitch.tv, so strict hostname checking fails. Keep full chain
    // validation but accept Twitch/Amazon-owned hostnames.
    const tlsOpts: tls.ConnectionOptions = {
      checkServerIdentity: (host, cert) => {
        const ok =
          tls.checkServerIdentity(host, cert) === undefined ||
          /(^|\.)twitch\.(tv|a2z\.com)$/.test(String(cert.subject?.CN ?? "")) ||
          (cert.subjectaltname ?? "").includes("twitch.a2z.com");
        return ok ? undefined : new Error("untrusted twitch irc certificate");
      },
    };
    socket = tls.connect(PORT, HOST, tlsOpts, () => {
      const nick = `justinfan${Math.floor(Math.random() * 80000) + 1000}`;
      socket!.write(`CAP REQ :twitch.tv/tags\r\n`);
      socket!.write(`NICK ${nick}\r\n`);
      socket!.write(`JOIN #${chan}\r\n`);
    });

    socket.on("data", (data: Buffer) => {
      buffer += data.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("PING")) {
          socket!.write(`PONG ${line.slice(5)}\r\n`);
          continue;
        }
        // :nick!... JOIN / 366 end-of-names => we're in
        if (line.includes(` 366 `) || line.includes(` JOIN #${chan}`)) {
          state.status = "connected";
          backoff = 1000;
          continue;
        }
        // @tags :user!user@user.tmi.twitch.tv PRIVMSG #chan :message
        const m = line.match(/^@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
        if (m) {
          const tags = parseTags(m[1]);
          onMessage({
            platform: "twitch",
            channel: chan,
            author: tags["display-name"] || m[2],
            text: m[3],
            color: tags["color"] || undefined,
            ts: new Date().toISOString(),
          });
        }
      }
    });

    const scheduleReconnect = (why: string) => {
      if (stopped) return;
      state.status = "error";
      state.lastError = why;
      const delay = backoff;
      backoff = Math.min(backoff * 2, 30000);
      reconnectTimer = setTimeout(connect, delay);
    };

    socket.on("error", (err) => scheduleReconnect(err.message));
    socket.on("close", () => scheduleReconnect("connection closed"));
  }

  connect();
  return state;
}
