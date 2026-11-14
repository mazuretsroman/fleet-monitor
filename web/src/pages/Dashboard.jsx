import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.js';
import { AddRobotForm } from '../components/AddRobotForm.jsx';
import { RobotList } from '../components/RobotList.jsx';
import { RobotMap } from '../components/RobotMap.jsx';
import { useRobotUpdates } from '../hooks/useRobotUpdates.js';

export function Dashboard() {
  const { token, logout } = useAuth();
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ignore the response if the component was unmounted meanwhile
    let cancelled = false;

    apiRequest('/robots', { token })
      .then((data) => {
        if (!cancelled) {
          setRobots(data.robots);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          return logout();
        }
        setError('Could not load robots.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  // useCallback keeps the function stable, so the WebSocket effect
  // does not reconnect on every render
  const upsertRobot = useCallback((robot) => {
    setRobots((current) =>
      current.some((item) => item.id === robot.id)
        ? current.map((item) => (item.id === robot.id ? robot : item))
        : [...current, robot],
    );
  }, []);

  useRobotUpdates(token, upsertRobot, logout);

  async function moveRobot(id) {
    try {
      const data = await apiRequest(`/robots/${id}/move`, {
        method: 'POST',
        token,
      });
      upsertRobot(data.robot);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return logout();
      }
      setError('Could not move the robot.');
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Mini-Fleet Monitor</h1>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </header>

      <main className="dashboard-body">
        <aside className="sidebar">
          <AddRobotForm onCreated={upsertRobot} />
          {loading && <p>Loading…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && (
            <RobotList robots={robots} onMove={moveRobot} />
          )}
        </aside>
        <RobotMap robots={robots} />
      </main>
    </div>
  );
}
