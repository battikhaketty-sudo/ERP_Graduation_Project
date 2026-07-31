import { NavLink } from "react-router-dom";
import { navItems } from "../constants/navigation";
import { useTranslation } from "../i18n";

type SidebarNavListProps = {
  onNavigate?: () => void;
};

const navLinkClass = (isActive: boolean) =>
  [
    "relative flex h-12 w-full items-center gap-2.5 rounded-e-[35px] py-[13px] pe-4 ps-6 text-sm font-medium transition-colors",
    isActive
      ? "bg-hr-nav-active text-hr-primary"
      : "text-hr-muted hover:bg-hr-hover hover:text-hr-text",
  ].join(" ");

export function SidebarNavList({ onNavigate }: SidebarNavListProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label={t("common.mainNav")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const label = t(item.labelKey);

        if (!item.to) {
          return (
            <button
              key={item.id}
              type="button"
              disabled
              className="relative flex h-12 w-full cursor-not-allowed items-center gap-2.5 rounded-e-[35px] py-[13px] pe-4 ps-6 text-sm font-medium text-hr-muted opacity-70"
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-y-2 end-0 w-1.5 rounded-full bg-hr-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  className={`size-[18px] shrink-0 ${isActive ? "text-hr-primary" : "text-hr-muted"}`}
                  strokeWidth={1.75}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
