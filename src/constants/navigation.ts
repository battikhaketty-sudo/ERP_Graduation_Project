import {
  Bell,
  BookOpen,
  Building2,
  FileText,
  FolderKanban,
  LayoutGrid,
  PanelsTopLeft,
  Users,
} from "lucide-react";
import { ROUTES } from "./routes";

export type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutGrid;
  to?: string;
};

export const navItems: NavItem[] = [
  { id: "dashboard", label: "الرئيسية", icon: LayoutGrid },
  { id: "projects", label: "إدارة المشاريع", icon: FolderKanban, to: ROUTES.projects },
  { id: "employees", label: "الموظفين", icon: Users, to: ROUTES.employees },
  { id: "departments", label: "الأقسام", icon: PanelsTopLeft, to: ROUTES.departments },
  { id: "hr", label: "قسم HR", icon: Building2, to: ROUTES.hr },
  { id: "learning", label: "learning", icon: BookOpen },
  { id: "memo", label: "Memo", icon: FileText },
  { id: "notifications", label: "الإشعارات", icon: Bell, to: ROUTES.notifications },
];
