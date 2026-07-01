import { useEffect, useState } from "react";
import { api } from "./api";
import { Me } from "./types";
import { Login } from "./components/Login";
import { Dashboard } from "./pages/Dashboard";

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function logout() {
    await api.logout();
    setMe(null);
  }

  if (loading) return null;
  if (!me) return <Login onLoggedIn={refresh} />;
  return <Dashboard me={me} onLogout={logout} />;
}
