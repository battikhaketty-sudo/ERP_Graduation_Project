import axios from "axios";
import { env } from "../config/env";
import { assertSuccess, unwrapData } from "../utils/apiResponse";
import {
  getRefreshToken,
  getStoredUser,
  getToken,
  setRefreshToken,
  setStoredUser,
  setToken,
} from "./tokenStorage";

type RefreshData = {
  accessToken?: string;
  refreshToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
};

/** Backend access-token lifetime. Refresh slightly before it expires. */
const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;
const EMAIL_CLAIM_KEYS = [
  "email",
  "Email",
  "unique_name",
  "preferred_username",
  "sub",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
];

let refreshInFlight: Promise<string> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let loopStarted = false;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const readNumericClaim = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getAccessTokenExpiryMs = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const exp = readNumericClaim(payload, "exp");
  if (exp) return exp * 1000;

  const iat = readNumericClaim(payload, "iat");
  if (iat) return iat * 1000 + ACCESS_TOKEN_TTL_MS;

  return null;
};

const getEmailFromAccessToken = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  for (const key of EMAIL_CLAIM_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && value.includes("@")) return value.trim();
  }

  return null;
};

const resolveRefreshEmail = () =>
  getStoredUser()?.email?.trim() ||
  (getToken() ? getEmailFromAccessToken(getToken()!) : null);

export const isAccessTokenExpiringSoon = (token = getToken()) => {
  if (!token) return false;
  const expiry = getAccessTokenExpiryMs(token);
  if (!expiry) return false;
  return expiry - Date.now() <= REFRESH_BEFORE_EXPIRY_MS;
};

const persistRefreshedSession = (accessToken: string, refreshToken?: string | null) => {
  setToken(accessToken);

  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  const email = resolveRefreshEmail() || getEmailFromAccessToken(accessToken);
  const stored = getStoredUser();
  if (email && stored?.email !== email) {
    setStoredUser({
      email,
      name: stored?.name || email.split("@")[0],
    });
  }
};

const refreshAccessTokenOnce = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  const email = resolveRefreshEmail();

  if (!refreshToken || !email) {
    throw {
      message: "لا توجد جلسة صالحة. يرجى تسجيل الدخول مجدداً.",
    };
  }

  const response = await axios.post(
    `${env.apiBaseUrl}/auth/refresh`,
    {
      refreshToken,
      email,
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  assertSuccess(response.data);

  const data = unwrapData<RefreshData>(response.data);
  const accessToken = data?.accessToken ?? data?.AccessToken;

  if (!accessToken) {
    throw {
      message: "تعذر تجديد الجلسة. يرجى تسجيل الدخول مجدداً.",
    };
  }

  persistRefreshedSession(
    accessToken,
    data?.refreshToken ?? data?.RefreshToken ?? null,
  );
  scheduleAccessTokenRefresh();
  return accessToken;
};

export const refreshAccessToken = (): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessTokenOnce().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export const ensureAccessTokenFresh = async (): Promise<string | null> => {
  const token = getToken();
  if (!token) return null;
  if (!isAccessTokenExpiringSoon(token) || !getRefreshToken()) return token;

  try {
    return await refreshAccessToken();
  } catch {
    return token;
  }
};

export const scheduleAccessTokenRefresh = () => {
  if (typeof window === "undefined") return;

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = getToken();
  if (!token || !getRefreshToken()) return;

  const expiry = getAccessTokenExpiryMs(token) ?? Date.now() + ACCESS_TOKEN_TTL_MS;
  const delay = Math.max(5_000, expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS);

  refreshTimer = setTimeout(() => {
    void refreshAccessToken().catch(() => {
      // The next API call still retries via the 401 interceptor.
    });
  }, delay);
};

export const stopAccessTokenRefreshLoop = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

export const startAccessTokenRefreshLoop = () => {
  if (typeof window === "undefined") return;

  scheduleAccessTokenRefresh();

  if (loopStarted) return;
  loopStarted = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void ensureAccessTokenFresh().then(() => scheduleAccessTokenRefresh());
  });
};
