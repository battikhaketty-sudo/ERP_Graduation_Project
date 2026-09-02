import api from "./api";
import { clearSession, getRefreshToken, getStoredUser, setRefreshToken, setToken } from "./tokenStorage";
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

export const changePassword = async (payload: {
  oldPassword: string;
  newPassword: string;
}) => {
  const res = await api.post("/auth/change-password", {
    oldPassword: payload.oldPassword,
    newPassword: payload.newPassword,
  });
  assertSuccess(res.data);
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post("/auth/forgot-password", { email: email.trim() });
  assertSuccess(res.data);
  return res.data;
};

export const resetPassword = async (payload: {
  email: string;
  otpCode: string;
  newPassword: string;
}) => {
  const res = await api.post("/auth/reset-password", {
    email: payload.email.trim(),
    otpCode: payload.otpCode.trim(),
    newPassword: payload.newPassword,
  });
  assertSuccess(res.data);
  return res.data;
};

export const confirmEmail = async (payload: { email: string; code: string }) => {
  const res = await api.post("/auth/confirm-email", {
    email: payload.email.trim(),
    code: payload.code.trim(),
  });
  assertSuccess(res.data);
  return res.data;
};

export const resendEmailConfirmCode = async (email: string) => {
  const res = await api.post("/auth/resend-email-confirm-code", {
    email: email.trim(),
  });
  assertSuccess(res.data);
  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout", {
      refreshToken: getRefreshToken(),
      email: getStoredUser()?.email,
    });
  } catch {
    // ignore logout API errors and clear local session anyway
  }
};

export default {
  login,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  confirmEmail,
  resendEmailConfirmCode,
};
