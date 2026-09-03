export const AUTH_ROUTES =
  /^\/auth\/(login|refresh|sign-up|forgot-password|reset-password|confirm-email|resend-email-confirm-code)/;

export const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return AUTH_ROUTES.test(url);
};
