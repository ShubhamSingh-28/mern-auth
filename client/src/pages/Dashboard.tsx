import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      {user && (
        <div className="dashboard-card">
          <p>Welcome back, {user.name}</p>
          <dl>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Member since</dt>
            <dd>{new Date(user.memberSince).toLocaleDateString()}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}