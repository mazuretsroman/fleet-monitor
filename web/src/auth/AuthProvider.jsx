import { useCallback, useState } from 'react';
import { apiRequest } from '../api.js';
import { AuthContext } from './AuthContext.js';

const STORAGE_KEY = 'token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
  }

  // useCallback keeps the same function between renders, so effects
  // that depend on logout do not re-run on every render
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return <AuthContext value={{ token, login, logout }}>{children}</AuthContext>;
}
