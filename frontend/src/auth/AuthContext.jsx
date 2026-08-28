import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints';
import { setTokens, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasToken = !!localStorage.getItem('crm_access_token');
    if (!hasToken) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { accessToken, refreshToken, user: loggedInUser } = await authApi.login({ email, password });
    setTokens({ accessToken, refreshToken });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('crm_refresh_token');
    try {
      await authApi.logout(refreshToken);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback((...roles) => !!user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
