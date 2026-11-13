import { useAuth } from '../auth/AuthContext.js';

export function Dashboard() {
  const { logout } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Mini-Fleet Monitor</h1>
        <button type="button" onClick={logout}>
          Log Out
        </button>
      </header>
    </main>
  );
}
