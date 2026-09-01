export const AUTH_ROUTES = /^\/auth\/(login|refresh|sign-up)/;

export const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return AUTH_ROUTES.test(url);
};
