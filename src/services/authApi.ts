import api from "./api";
import { clearSession, setRefreshToken, setToken } from "./tokenStorage";
import type { AuthUser, LoginCredentials, LoginResult } from "../types/auth";
import { assertSuccess, unwrapData } from "../utils/apiResponse";

type LoginData = {
  accessToken?: string;
  refreshToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
};

const readAccessToken = (data: LoginData | null) =>
  data?.accessToken ?? data?.AccessToken ?? null;

const readRefreshToken = (data: LoginData | null) =>
  data?.refreshToken ?? data?.RefreshToken ?? null;

export const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
  clearSession();

  const res = await api.post("/auth/login", {
    email: credentials.email.trim(),
    password: credentials.password,
  });

  const payload = res.data;
  assertSuccess(payload);

  const data = unwrapData<LoginData>(payload);
  const token = readAccessToken(data);

  if (!token) {
    throw {
      message: "تم تسجيل الدخول لكن لم يُرجع السيرفر accessToken.",
    };
  }

  if (readRefreshToken(data)) {
    setRefreshToken(readRefreshToken(data)!);
  }

  const user: AuthUser = {
    email: credentials.email,
    name: credentials.email.split("@")[0],
  };

  setToken(token);

  return { token, user };
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore logout API errors and clear local session anyway
  }
};

export default { login, logout };
