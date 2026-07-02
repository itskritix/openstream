import { useEffect, useState } from "react";
import { api } from "../api";
import { AppEvent } from "../types";

const LEVEL_COLOR: Record<AppEvent["level"], string> = {
  info: "var(--muted)",
  warn: "var(--warn)",
  error: "var(--error)",
};

export function EventLog() {
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const e = await api.events();
        if (alive) setEvents(e);
      } catch {
        /* transient */
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="card">
      <h2>Events</h2>
      <div className="event-scroll">
        {events.map((e, i) => (
          <div className="mono" key={i} style={{ fontSize: 12, color: LEVEL_COLOR[e.level], padding: "2px 0" }}>
            {new Date(e.ts).toLocaleTimeString()} — {e.message}
          </div>
        ))}
      </div>
    </div>
  );
}
