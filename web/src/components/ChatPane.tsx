import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { ChatMessage, ChatSourceInfo } from "../types";

const PLATFORM_COLORS: Record<string, string> = {
  twitch: "#9146FF",
  youtube: "#FF0000",
};

export function ChatPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<ChatSourceInfo[]>([]);
  const [platform, setPlatform] = useState("twitch");
  const [identifier, setIdentifier] = useState("");
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSources = useCallback(async () => {
    try {
      setSources(await api.chatSources());
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    loadSources();
    const t = setInterval(loadSources, 10000);
    return () => clearInterval(t);
  }, [loadSources]);

  // SSE live feed
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (e) => {
      const m = JSON.parse(e.data) as ChatMessage;
      setMessages((prev) => [...prev.slice(-199), m]);
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, paused]);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    await api.addChatSource(platform, identifier.trim());
    setIdentifier("");
    await loadSources();
  }

  async function removeSource(id: number) {
    await api.deleteChatSource(id);
    await loadSources();
  }

  return (
    <div className="card chat-card">
      <h2>Unified chat</h2>

      <form className="row" onSubmit={addSource} style={{ marginBottom: 8 }}>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: 110 }}>
          <option value="twitch">Twitch</option>
          <option value="youtube">YouTube</option>
        </select>
        <input
          className="grow"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={platform === "twitch" ? "channel name" : "@handle or video URL"}
        />
        <button className="small primary">Add</button>
      </form>

      {sources.map((s) => (
        <div className="row muted" key={s.id} style={{ marginBottom: 4, fontSize: 13 }}>
          <span>
            <span className="chat-badge" style={{ background: PLATFORM_COLORS[s.platform] }} />
            {s.identifier} — {s.status}
            {s.status !== "connected" && s.lastError ? ` (${s.lastError})` : ""}
          </span>
          <button className="small danger" onClick={() => removeSource(s.id)}>
            ×
          </button>
        </div>
      ))}

      <div
        className="chat-scroll"
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {messages.length === 0 && <p className="muted">Messages from all connected chats appear here.</p>}
        {messages.map((m, i) => (
          <div className="chat-msg" key={i}>
            <span className="chat-badge" style={{ background: PLATFORM_COLORS[m.platform] }} />
            <span className="chat-author" style={{ color: m.color || "var(--accent)" }}>
              {m.author}
            </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
