export const ROUTES = {
  login: "/login",
  projects: "/projects",
  employees: "/employees",
  departments: "/departments",
  hr: "/hr",
  access: "/access",
  notifications: "/notifications",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
