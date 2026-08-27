import { LogOut } from "lucide-react";
import { useTranslation } from "../i18n";
import { SidebarNavList } from "./SidebarNavList";

type SidebarProps = {
  onLogout: () => void;
};

export function Sidebar({ onLogout }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="theme-transition hidden h-full min-w-[200px] w-max max-w-[26rem] shrink-0 flex-col border-s border-hr-border bg-hr-surface md:flex">
      <div className="flex flex-col items-center gap-2 px-4 pb-6 pt-8">
        <div
          className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#EB5757] via-hr-surface to-[#2F80ED] p-[3px]"
          aria-hidden
        >
          <div className="flex size-full items-center justify-center rounded-full bg-hr-surface">
            <div className="size-8 rounded-full bg-gradient-to-br from-[#EB5757] to-[#2F80ED]" />
          </div>
        </div>
        <p className="text-sm font-bold text-hr-text">{t("common.appName")}</p>
      </div>

      <SidebarNavList />

      <div className="border-t border-hr-border p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center gap-2.5 rounded-e-[35px] py-[13px] pe-4 ps-6 text-sm font-medium text-hr-muted transition hover:bg-hr-hover hover:text-hr-text"
        >
          <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span>{t("common.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
