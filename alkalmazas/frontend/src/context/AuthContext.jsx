import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const STORAGE_KEY = 'tollaslabda-auth';
const AuthContext = createContext(null);

function loadStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: '', user: null };
    const parsed = JSON.parse(raw);
    return { token: parsed.token ?? '', user: parsed.user ?? null };
  } catch {
    return { token: '', user: null };
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => loadStored().token);
  const [user, setUser] = useState(() => loadStored().user);
  const [loading, setLoading] = useState(Boolean(loadStored().token));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      window.localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  }, [token, user]);

  useEffect(() => {
    let active = true;
    async function restore() {
      if (!token) return;
      try {
        const data = await api.get('/api/auth/me', { token });
        if (!active) return;
        setUser(data.user);
        setError('');
      } catch {
        if (!active) return;
        setToken('');
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => { active = false; };
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    error,
    isAuthenticated: Boolean(token && user),
    async login(credentials) {
      const data = await api.post('/api/auth/login', credentials);
      setToken(data.token);
      setUser(data.user);
      setError('');
      return data;
    },
    async register(payload) {
      const data = await api.post('/api/auth/register', payload);
      setToken(data.token);
      setUser(data.user);
      setError('');
      return data;
    },
    logout() {
      setToken('');
      setUser(null);
      setError('');
      setLoading(false);
      window.localStorage.removeItem(STORAGE_KEY);
    },
    setError,
  }), [token, user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
