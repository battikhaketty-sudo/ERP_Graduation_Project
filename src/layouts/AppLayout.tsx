import { Outlet, useNavigate } from "react-router-dom";
import { CommandBar } from "../components/command/CommandBar";
import { AppTopBar } from "../components/layout/AppTopBar";
import { Sidebar } from "../components/Sidebar";
import { ScrollToTopButton } from "../components/ui/ScrollToTopButton";
import { ToastStack } from "../components/ui/ToastStack";
import { CommandBarProvider } from "../context/CommandBarContext";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import { ToastProvider } from "../context/ToastContext";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { usePreferences } from "../context/PreferencesContext";

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { dir } = usePreferences();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="theme-transition flex h-dvh max-h-dvh overflow-hidden bg-hr-bg" dir={dir}>
      <Sidebar onLogout={handleLogout} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar user={user} onLogout={handleLogout} />

        <div
          data-app-scroll
          className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
        >
          <div className="flex min-h-full flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </div>

      <ScrollToTopButton />
      <CommandBar />
      <ToastStack />
    </div>
  );
}

export function AppLayout() {
  return (
    <ToastProvider>
      <CommandBarProvider>
        <ConfirmDialogProvider>
          <AppShell />
        </ConfirmDialogProvider>
      </CommandBarProvider>
    </ToastProvider>
  );
}
