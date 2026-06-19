import { ROUTES } from "../constants/routes";

type AppRouter = {
  navigate: (
    to: string,
    options?: { replace?: boolean; state?: Record<string, unknown> },
  ) => void;
};

let appRouter: AppRouter | null = null;

export function bindAppRouter(router: AppRouter) {
  appRouter = router;
}

export function redirectToLogin(message?: string) {
  appRouter?.navigate(ROUTES.login, {
    replace: true,
    state: {
      sessionExpired: true,
      message: message ?? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.",
    },
  });
}
