// In-memory ring buffer of lifecycle events, surfaced in the dashboard so
// "why did my stream drop at 3am?" is a glance instead of a log dive.

export interface AppEvent {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
}

const MAX_EVENTS = 300;
const events: AppEvent[] = [];

export function logEvent(level: AppEvent["level"], message: string): void {
  events.push({ ts: new Date().toISOString(), level, message });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  const tag = level === "info" ? "[event]" : `[event:${level}]`;
  console.log(`${tag} ${message}`);
}

export function recentEvents(limit = 100): AppEvent[] {
  return events.slice(-limit).reverse();
}
