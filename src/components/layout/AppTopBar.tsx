import { Search } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { PreferencesControls } from "../preferences/PreferencesControls";
import { UserProfileButton } from "./UserProfileButton";
import { useCommandBar } from "../../context/CommandBarContext";
import { useTranslation } from "../../i18n";
import type { AuthUser } from "../../types/auth";

type AppTopBarProps = {
  user: AuthUser | null;
  onLogout: () => void;
};

export function AppTopBar({ user, onLogout }: AppTopBarProps) {
  const { open } = useCommandBar();
  const { t } = useTranslation();

  return (
    <header className="theme-transition relative sticky top-0 z-50 flex h-[68px] shrink-0 items-center gap-3 border-b border-hr-border bg-hr-header-bg px-4 shadow-sm sm:gap-4 sm:px-6">
      <MobileNav onLogout={onLogout} />

      <button
        type="button"
        onClick={open}
        className="hidden items-center gap-2 rounded-xl border border-hr-border bg-hr-hover px-4 py-2 text-sm text-hr-muted transition hover:border-hr-primary hover:text-hr-text sm:inline-flex"
      >
        <Search className="size-4" />
        <span>{t("common.search")}</span>
        <kbd className="rounded bg-hr-surface px-1.5 py-0.5 text-xs ring-1 ring-hr-border">
          Ctrl+K
        </kbd>
      </button>

      <PreferencesControls compact className="hidden sm:flex" />

      <div
        className="pointer-events-none ms-auto w-12 shrink-0 sm:w-14"
        aria-hidden
      />

      <div className="absolute inset-y-0 end-0 flex items-center gap-4 px-4 sm:px-6">
        <UserProfileButton user={user} />
      </div>
    </header>
  );
}
