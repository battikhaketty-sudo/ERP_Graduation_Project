import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as loginRequest, logout as logoutRequest } from "../services/authApi";
import {
  clearSession,
  getStoredUser,
  getToken,
  hasActiveSession,
  setStoredUser,
  setToken,
} from "../services/tokenStorage";
import {
  startAccessTokenRefreshLoop,
  stopAccessTokenRefreshLoop,
} from "../services/tokenRefresh";
import type { AuthUser, LoginCredentials } from "../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!hasActiveSession()) return null;
    startAccessTokenRefreshLoop();
    return getStoredUser();
  });

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await loginRequest(credentials);
    setToken(result.token);
    setStoredUser(result.user);
    setUser(result.user);
    startAccessTokenRefreshLoop();
  }, []);

  const logout = useCallback(() => {
    void logoutRequest();
    stopAccessTokenRefreshLoop();
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && getToken()),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
