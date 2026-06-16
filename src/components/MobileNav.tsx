import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { SidebarNavList } from "./SidebarNavList";

type MobileNavProps = {
  onLogout: () => void;
};

export function MobileNav({ onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 transition hover:bg-gray-100 md:hidden"
        aria-label="فتح القائمة"
      >
        {isOpen ? (
          <X className="size-6 text-hr-text" strokeWidth={1.75} />
        ) : (
          <Menu className="size-6 text-hr-text" strokeWidth={1.75} />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-[200px] transform flex-col border-s border-hr-border bg-white transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
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

        <SidebarNavList onNavigate={() => setIsOpen(false)} />

        <div className="border-t border-hr-border p-3">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex h-12 w-full items-center gap-2.5 rounded-e-[35px] py-[13px] pe-4 ps-6 text-sm font-medium text-hr-muted transition hover:bg-gray-50 hover:text-hr-text"
          >
            <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
