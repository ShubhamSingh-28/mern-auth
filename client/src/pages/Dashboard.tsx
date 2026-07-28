import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";

interface DashboardData {
  message: string;
  user: { id: string; name: string; email: string; memberSince: string };
}

export function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/dashboard");
        setData(res.data);
      } catch {
        setError("Could not load dashboard data");
      }
    })();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={handleLogout}>Log out</button>
      </header>
      {error && <p className="form-error">{error}</p>}
      {data ? (
        <div className="dashboard-card">
          <p>{data.message}</p>
          <dl>
            <dt>Email</dt>
            <dd>{data.user.email}</dd>
            <dt>Member since</dt>
            <dd>{new Date(data.user.memberSince).toLocaleDateString()}</dd>
          </dl>
        </div>
      ) : (
        !error && <p>Loading…</p>
      )}
    </div>
  );
}
