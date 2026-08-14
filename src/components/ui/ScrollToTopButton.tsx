import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n";

/**
 * Floating control that appears after scrolling any app panel,
 * and smoothly returns that panel (and the main outlet) to the top.
 */
export function ScrollToTopButton() {
  const { t } = useTranslation();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const lastScrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setVisible(false);
    lastScrollerRef.current = null;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.scrollTop > 240) {
        lastScrollerRef.current = target;
        setVisible(true);
      } else if (lastScrollerRef.current === target) {
        setVisible(false);
      }
    };

    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const appScroll = document.querySelector("[data-app-scroll]");
        const targets = [
          lastScrollerRef.current,
          appScroll instanceof HTMLElement ? appScroll : null,
        ].filter((el): el is HTMLElement => Boolean(el));

        targets.forEach((el) => {
          el.scrollTo({ top: 0, behavior: "smooth" });
        });
        setVisible(false);
      }}
      title={t("common.scrollToTop")}
      aria-label={t("common.scrollToTop")}
      className={[
        "fixed bottom-5 z-40 inline-flex size-11 items-center justify-center",
        "rounded-full border border-hr-border bg-hr-surface text-hr-primary shadow-lg",
        "transition hover:bg-hr-primary hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hr-primary/40",
        "end-5",
      ].join(" ")}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
