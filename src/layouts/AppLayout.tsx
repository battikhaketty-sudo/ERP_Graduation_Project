import { LogOut } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MobileNav } from "../components/MobileNav";
import { Sidebar } from "../components/Sidebar";
import { ROUTES } from "../constants/routes";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="flex min-h-dvh overflow-hidden" dir="rtl">
      <Sidebar onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-hr-border bg-white px-6">
          <MobileNav onLogout={handleLogout} />
          <div className="ms-auto flex items-center gap-4">
            <div className="hidden text-end sm:block">
              <p className="text-sm font-semibold leading-tight text-hr-text">{user?.name}</p>
              <p className="text-xs leading-tight text-hr-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-hr-border px-4 text-sm font-medium text-hr-text transition hover:bg-gray-50"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
