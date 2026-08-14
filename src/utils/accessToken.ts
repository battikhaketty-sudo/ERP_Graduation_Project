import { getStoredUser, getToken } from "../services/tokenStorage";

const readClaim = (payload: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

/** Best-effort decode of the access token claims (no signature verification). */
export const getAccessTokenClaims = (): Record<string, unknown> | null => {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const getCurrentActorIds = () => {
  const claims = getAccessTokenClaims();
  if (!claims) return [] as string[];

  const ids = [
    readClaim(claims, "employeeId", "EmployeeId", "employee_id"),
    readClaim(claims, "userId", "UserId", "user_id", "uid", "sub", "nameid"),
    readClaim(
      claims,
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    ),
  ].filter(Boolean);

  return [...new Set(ids)];
};

export const getCurrentUserEmail = () => {
  const claims = getAccessTokenClaims();
  const fromClaims = claims
    ? readClaim(
        claims,
        "email",
        "Email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      )
    : "";
  return (fromClaims || getStoredUser()?.email || "").trim().toLowerCase();
};

export const getCurrentUserName = () => {
  const claims = getAccessTokenClaims();
  const fromClaims = claims
    ? readClaim(claims, "name", "Name", "unique_name", "given_name")
    : "";
  return (fromClaims || getStoredUser()?.name || "").trim();
};
