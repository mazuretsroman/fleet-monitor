import { useState } from 'react';
import { ApiError } from '../api.js';
import { useAuth } from '../auth/AuthContext.js';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Cannot reach the server.',
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Mini-Fleet Monitor</h1>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
