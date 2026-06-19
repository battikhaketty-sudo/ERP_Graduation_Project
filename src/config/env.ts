const readEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const env = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "/api/v1"),
  apiProxyTarget: readEnv("VITE_API_PROXY_TARGET", "http://mag-erp-system.runasp.net"),
  apiHost: readEnv("VITE_API_HOST", "http://mag-erp-system.runasp.net"),
} as const;
