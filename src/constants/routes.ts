export const ROUTES = {
  login: "/login",
  dashboard: "/",
  projects: "/projects",
  employees: "/employees",
  departments: "/departments",
  hr: "/hr",
  access: "/access",
  profile: "/profile",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
