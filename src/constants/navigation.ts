import {
  Building2,
  FolderKanban,
  LayoutGrid,
  PanelsTopLeft,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ROUTES } from "./routes";
import type { TranslationKey } from "../i18n/types";

export type NavItem = {
  id: string;
  labelKey: TranslationKey;
  icon: typeof LayoutGrid;
  to?: string;
  end?: boolean;
};

export const navItems: NavItem[] = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutGrid, to: ROUTES.dashboard, end: true },
  { id: "projects", labelKey: "nav.projects", icon: FolderKanban, to: ROUTES.projects },
  { id: "employees", labelKey: "nav.employees", icon: Users, to: ROUTES.employees },
  { id: "departments", labelKey: "nav.departments", icon: PanelsTopLeft, to: ROUTES.departments },
  { id: "access", labelKey: "nav.access", icon: ShieldCheck, to: ROUTES.access },
  { id: "hr", labelKey: "nav.hr", icon: Building2, to: ROUTES.hr },
];
