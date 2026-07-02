import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Destination, Me, RelayState, Status } from "../types";
import { DestinationForm } from "../components/DestinationForm";
import { StatusBadge } from "../components/StatusBadge";
import { Settings } from "../components/Settings";
import { RecordingsPanel } from "../components/RecordingsPanel";
import { ChatPane } from "../components/ChatPane";
import { EventLog } from "../components/EventLog";

export function Dashboard({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [status, setStatus] = useState<Status | null>(null);

  const loadDestinations = useCallback(async () => {
    setDestinations(await api.listDestinations());
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  // Poll live status every 2s.
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const s = await api.status();
        if (alive) setStatus(s);
      } catch {
        /* ignore transient errors */
      }
    }
    poll();
    const t = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const relayById = new Map<number, RelayState>();
  status?.destinations.forEach((r) => relayById.set(r.destId, r));
  const ingestLive = status?.ingest.live ?? false;

  async function toggle(id: number) {
    await api.toggleDestination(id);
    await loadDestinations();
  }
  async function remove(id: number) {
    if (!confirm("Delete this destination?")) return;
    await api.deleteDestination(id);
    await loadDestinations();
  }

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className={`dot ${ingestLive ? "live" : ""}`} />
          <h1>OpenStream</h1>
          <span className="muted">{ingestLive ? "ingest live" : "waiting for stream"}</span>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="muted">{me.username}</span>
          <button className="small" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="container wide">
        <div className="columns">
          <div className="col-main">
        <Settings me={me} />

        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Destinations</h2>
          </div>

          {destinations.length === 0 && (
            <p className="muted">No destinations yet. Add one below to start multistreaming.</p>
          )}

          {destinations.map((d) => {
            const relay = relayById.get(d.id);
            const badge = !d.enabled ? "offline" : relay ? relay.status : ingestLive ? "starting" : "offline";
            return (
              <div className="dest" key={d.id}>
                <div className="grow">
                  <div className="name">{d.name}</div>
                  <div className="muted mono">
                    {d.rtmpUrl} · {d.keyMasked}
                  </div>
                  {relay?.lastError && d.enabled && (
                    <div className="muted" style={{ color: "var(--warn)" }}>
                      {relay.lastError}
                      {relay.restarts > 0 ? ` · ${relay.restarts} restarts` : ""}
                    </div>
                  )}
                  {relay?.status === "live" && relay.bitrateKbps != null && (
                    <div className="muted">{relay.bitrateKbps} kbps</div>
                  )}
                </div>
                <StatusBadge status={badge} />
                <div className="actions">
                  <button className="small" onClick={() => toggle(d.id)}>
                    {d.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="small danger" onClick={() => remove(d.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <DestinationForm onAdded={loadDestinations} />

        <RecordingsPanel />
        <EventLog />
          </div>
          <div className="col-side">
            <ChatPane />
          </div>
        </div>
      </div>
    </>
  );
}
