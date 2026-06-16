import { LogOut } from "lucide-react";
import { SidebarNavList } from "./SidebarNavList";

type SidebarProps = {
  onLogout: () => void;
};

export function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside
      className="hidden h-full w-[200px] shrink-0 flex-col border-s border-hr-border bg-white md:flex"
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-2 px-4 pb-6 pt-8">
        <div
          className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#EB5757] via-white to-[#2F80ED] p-[3px]"
          aria-hidden
        >
          <div className="flex size-full items-center justify-center rounded-full bg-white">
            <div className="size-8 rounded-full bg-gradient-to-br from-[#EB5757] to-[#2F80ED]" />
          </div>
        </div>
        <p className="text-sm font-bold text-hr-text">HR System</p>
      </div>

      <SidebarNavList />

      <div className="border-t border-hr-border p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center gap-2.5 rounded-e-[35px] py-[13px] pe-4 ps-6 text-sm font-medium text-hr-muted transition hover:bg-gray-50 hover:text-hr-text"
        >
          <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
