import { Destination, Me, Status } from "./types";

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  me: () => req<Me>("/api/me"),
  login: (username: string, password: string) =>
    req<{ username: string }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req<{ ok: boolean }>("/api/logout", { method: "POST" }),

  status: () => req<Status>("/api/status"),

  listDestinations: () => req<Destination[]>("/api/destinations"),
  createDestination: (d: {
    name: string;
    platform: string;
    rtmpUrl: string;
    streamKey: string;
    enabled: boolean;
  }) => req<Destination>("/api/destinations", { method: "POST", body: JSON.stringify(d) }),
  updateDestination: (
    id: number,
    d: Partial<{ name: string; platform: string; rtmpUrl: string; streamKey: string; enabled: boolean }>,
  ) => req<Destination>(`/api/destinations/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  toggleDestination: (id: number) =>
    req<Destination>(`/api/destinations/${id}/toggle`, { method: "POST" }),
  deleteDestination: (id: number) => req<void>(`/api/destinations/${id}`, { method: "DELETE" }),
};
