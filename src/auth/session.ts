import { login as loginRequest, logout as logoutRequest } from "../services/authApi";
import {
  clearSession as clearStoredSession,
  getStoredUser,
  getToken,
  hasActiveSession,
  setStoredUser,
  setToken,
} from "../services/tokenStorage";
import type { AuthUser, LoginCredentials } from "../types/auth";

export type Session = {
  user: AuthUser;
  token: string;
};

export function getSession(): Session | null {
  if (!hasActiveSession()) return null;
  const user = getStoredUser();
  const token = getToken();
  if (!user || !token) return null;
  return { user, token };
}

export async function login(credentials: LoginCredentials): Promise<Session> {
  const result = await loginRequest(credentials);
  setToken(result.token);
  setStoredUser(result.user);
  return { user: result.user, token: result.token };
}

export async function logout() {
  try {
    await logoutRequest();
  } catch {
    // ignore API errors — always clear local session
  }
  clearStoredSession();
}

export function clearSession() {
  clearStoredSession();
}
