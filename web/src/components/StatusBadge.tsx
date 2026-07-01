import { RelayStatus } from "../types";

const LABELS: Record<RelayStatus, string> = {
  starting: "Starting",
  live: "Live",
  reconnecting: "Reconnecting",
  error: "Error",
  stopped: "Stopped",
};

export function StatusBadge({ status }: { status: RelayStatus | "offline" }) {
  if (status === "offline") {
    return (
      <span className="badge">
        <span className="dot" /> Offline
      </span>
    );
  }
  return (
    <span className={`badge ${status}`}>
      <span className="dot" /> {LABELS[status]}
    </span>
  );
}
