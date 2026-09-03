import {
  Building2,
  CalendarClock,
  FolderKanban,
  LayoutGrid,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useCommandBar } from "../../context/CommandBarContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";

export function CommandBar() {
  const navigate = useNavigate();
  const { isOpen, setOpen, close, pageActions } = useCommandBar();
  const [query, setQuery] = useState("");
  const { t } = useTranslation();
  const { dir } = usePreferences();

  const navItems = useMemo(
    () => [
      {
        id: "nav-home",
        label: t("command.navHome"),
        route: ROUTES.dashboard,
        keywords: ["رئيسية", "لوحة", "home", "dashboard"],
        icon: LayoutGrid,
      },
      {
        id: "nav-employees",
        label: t("command.navEmployees"),
        route: ROUTES.employees,
        keywords: ["موظف", "employee", "staff"],
        icon: Users,
      },
      {
        id: "nav-departments",
        label: t("command.navDepartments"),
        route: ROUTES.departments,
        keywords: ["قسم", "department"],
        icon: Building2,
      },
      {
        id: "nav-projects",
        label: t("command.navProjects"),
        route: ROUTES.projects,
        keywords: ["مشروع", "project"],
        icon: FolderKanban,
      },
      {
        id: "nav-access",
        label: t("command.navAccess"),
        route: ROUTES.access,
        keywords: ["هوية", "وصول", "أدوار", "صلاحيات", "access", "iam", "roles"],
        icon: ShieldCheck,
      },
      {
        id: "nav-hr",
        label: t("command.navHr"),
        route: ROUTES.hr,
        keywords: ["حضور", "دوام", "attendance", "hr"],
        icon: CalendarClock,
      },
      {
        id: "nav-profile",
        label: t("header.profileMenu"),
        route: ROUTES.profile,
        keywords: ["ملف", "بروفايل", "profile", "account"],
        icon: Users,
      },
    ],
    [t],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, setOpen]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const items = useMemo(() => {
    const navigation = navItems.map((item) => ({
      id: item.id,
      label: item.label,
      group: "navigation" as const,
      icon: item.icon,
      onSelect: () => {
        navigate(item.route);
        close();
      },
      searchText: [item.label, ...item.keywords].join(" ").toLowerCase(),
    }));

    const actions = pageActions.map((action) => ({
      id: action.id,
      label: action.label,
      group: action.group,
      icon: Plus,
      onSelect: () => {
        action.onSelect();
        close();
      },
      searchText: [action.label, ...(action.keywords ?? [])].join(" ").toLowerCase(),
    }));

    const normalizedQuery = query.trim().toLowerCase();
    const combined = [...navigation, ...actions];

    if (!normalizedQuery) return combined;

    return combined.filter((item) => item.searchText.includes(normalizedQuery));
  }, [close, navigate, navItems, pageActions, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      dir={dir}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("command.close")}
        onClick={close}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-hr-surface shadow-2xl">
        <div className="border-b border-hr-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("command.placeholder")}
              className="h-11 w-full rounded-xl border border-hr-border bg-hr-input-bg pe-3 ps-9 text-sm outline-none focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-hr-muted">{t("command.noResults")}</p>
          ) : (
            items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition hover:bg-hr-nav-active"
                >
                  <Icon className="size-4 shrink-0 text-hr-primary" />
                  <span className="flex-1 font-medium text-hr-text">{item.label}</span>
                  <span className="text-xs text-hr-muted">
                    {item.group === "navigation" ? t("command.navigate") : t("command.action")}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-hr-border bg-hr-hover px-4 py-2 text-xs text-hr-muted">
          <kbd className="rounded bg-hr-surface px-1.5 py-0.5 ring-1 ring-hr-border">Ctrl</kbd>
          {" + "}
          <kbd className="rounded bg-hr-surface px-1.5 py-0.5 ring-1 ring-hr-border">K</kbd>
          {` ${t("command.hintOpen")} · `}
          <kbd className="rounded bg-hr-surface px-1.5 py-0.5 ring-1 ring-hr-border">Esc</kbd>
          {` ${t("command.hintClose")}`}
        </div>
      </div>
    </div>
  );
}
