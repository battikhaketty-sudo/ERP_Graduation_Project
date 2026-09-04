export const ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  confirmEmail: "/confirm-email",
  dashboard: "/",
  projects: "/projects",
  employees: "/employees",
  departments: "/departments",
  hr: "/hr",
  access: "/access",
  profile: "/profile",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Department management lives under HR, not as a sidebar page. */
export const hrDepartmentsPath = `${ROUTES.hr}?section=departments`;
