import { Innertube } from "youtubei.js";
import { ChatMessage, Connector } from "./types";

// YouTube live chat via youtubei.js — an actively maintained InnerTube client.
// Read-only and unofficial. Note: YouTube bot-checks anonymous requests from
// datacenter IPs ("Sign in to confirm you're not a bot"); on such hosts chat
// stays in "waiting" with that error surfaced to the UI.

let innertubePromise: Promise<Innertube> | null = null;
function getInnertube(): Promise<Innertube> {
  innertubePromise ??= Innertube.create({ retrieve_player: false });
  return innertubePromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// identifier can be: watch/live URL, video ID, @handle, channel URL, channel name
async function resolveVideoId(identifier: string): Promise<string> {
  const id = identifier.trim();
  const vidMatch = id.match(/(?:v=|youtu\.be\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (vidMatch) return vidMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(id) && !id.startsWith("@")) return id;

  const yt = await getInnertube();
  let channelId: string | undefined;
  if (/^UC[A-Za-z0-9_-]{22}$/.test(id)) {
    channelId = id;
  } else {
    const handle = id.startsWith("http") ? id : `https://www.youtube.com/${id.startsWith("@") ? id : "@" + id}`;
    const resolved = (await yt.resolveURL(handle)) as Any;
    channelId = resolved?.payload?.browseId;
  }
  if (!channelId) throw new Error(`could not resolve channel for "${identifier}"`);

  const channel = (await yt.getChannel(channelId)) as Any;
  const lives = await channel.getLiveStreams();
  // Newer YouTube UI returns LockupView items where the video id is content_id.
  const first = (lives?.videos ?? [])
    .map((v: Any) => v.content_id ?? v.id)
    .filter(Boolean)[0];
  if (!first) throw new Error("channel has no live stream right now");
  return first;
}

function friendlyError(msg: string): string {
  if (/confirm you.?re not a bot|LOGIN_REQUIRED/i.test(msg)) {
    return "YouTube bot-check blocks this server's IP (common on cloud hosts) — try from a different network";
  }
  return msg;
}

export function startYouTube(
  identifier: string,
  onMessage: (m: ChatMessage) => void,
): Connector {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let livechat: Any = null;

  const state: Connector = {
    status: "connecting",
    lastError: null,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      try {
        livechat?.stop();
      } catch {
        /* already stopped */
      }
    },
  };

  const retry = (why: string, ms: number) => {
    if (stopped) return;
    state.status = "waiting";
    state.lastError = friendlyError(why);
    try {
      livechat?.stop();
    } catch {
      /* noop */
    }
    livechat = null;
    timer = setTimeout(run, ms);
  };

  async function run(): Promise<void> {
    if (stopped) return;
    state.status = "connecting";
    try {
      const videoId = await resolveVideoId(identifier);
      const yt = await getInnertube();
      const info = (await yt.getInfo(videoId)) as Any;
      const playability = info.playability_status;
      if (playability?.status && playability.status !== "OK") {
        throw new Error(playability.reason || playability.status);
      }
      livechat = info.getLiveChat();

      livechat.on("chat-update", (action: Any) => {
        if (action?.type !== "AddChatItemAction") return;
        const item = action.item;
        if (item?.type !== "LiveChatTextMessage") return;
        state.status = "connected";
        state.lastError = null;
        onMessage({
          platform: "youtube",
          channel: identifier,
          author: item.author?.name ?? "unknown",
          text: item.message?.toString() ?? "",
          ts: new Date().toISOString(),
        });
      });
      livechat.on("start", () => {
        state.status = "connected";
        state.lastError = null;
      });
      livechat.on("end", () => retry("stream ended", 60000));
      livechat.on("error", (err: Error) => retry(err.message, 60000));
      livechat.start();
    } catch (err) {
      retry((err as Error).message, 60000);
    }
  }

  void run();
  return state;
}
