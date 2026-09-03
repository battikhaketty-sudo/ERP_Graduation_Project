import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PreferencesControls } from "../preferences/PreferencesControls";
import { ROUTES } from "../../constants/routes";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backToLogin?: boolean;
};

export function AuthShell({ title, subtitle, children, backToLogin }: AuthShellProps) {
  const { dir } = usePreferences();
  const { t } = useTranslation();

  return (
    <div
      className="theme-transition relative flex min-h-screen items-center justify-center bg-hr-bg px-4 py-10"
      dir={dir}
    >
      <div className="absolute top-4 end-4">
        <PreferencesControls />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#EB5757] via-hr-surface to-[#2F80ED] p-[3px]"
            aria-hidden
          >
            <div className="flex size-full items-center justify-center rounded-full bg-hr-surface">
              <div className="size-10 rounded-full bg-gradient-to-br from-[#EB5757] to-[#2F80ED]" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-hr-text">{t("common.appName")}</h1>
            <p className="mt-1 text-sm text-hr-muted">{t("common.appSubtitle")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-hr-border bg-hr-surface p-8 shadow-card">
          {backToLogin ? (
            <Link
              to={ROUTES.login}
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-hr-muted transition hover:text-hr-primary"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" />
              {t("auth.backToLogin")}
            </Link>
          ) : null}

          <h2 className="mb-1 text-center text-xl font-bold text-hr-text">{title}</h2>
          {subtitle ? (
            <p className="mb-6 text-center text-sm leading-6 text-hr-muted">{subtitle}</p>
          ) : (
            <div className="mb-6" />
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
