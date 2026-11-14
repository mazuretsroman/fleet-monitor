import { useState } from 'react';
import { ApiError, apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.js';

export function AddRobotForm({ onCreated }) {
  const { token, logout } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiRequest('/robots', {
        method: 'POST',
        body: { name },
        token,
      });
      onCreated(data.robot);
      setName('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return logout();
      }
      setError(
        err instanceof ApiError ? err.message : 'Cannot reach the server.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-robot" onSubmit={handleSubmit}>
      <label htmlFor="robot-name">New robot</label>
      <div className="add-robot-row">
        <input
          id="robot-name"
          placeholder="Name"
          maxLength={50}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" disabled={submitting}>
          Add
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
