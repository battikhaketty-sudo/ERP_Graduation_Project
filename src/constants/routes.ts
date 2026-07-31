export const ROUTES = {
  login: "/login",
  dashboard: "/",
  projects: "/projects",
  employees: "/employees",
  departments: "/departments",
  hr: "/hr",
  access: "/access",
  notifications: "/notifications",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
