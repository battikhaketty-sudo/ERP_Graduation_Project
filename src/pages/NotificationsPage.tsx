import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getNotificationsSeed } from "../data/notifications";
import { AddProjectButton } from "../components/ui/AddProjectButton";
import { usePreferences } from "../context/PreferencesContext";
import { useTranslation } from "../i18n";

const PAGE_SIZE = 3;

export function NotificationsPage() {
  const { dir, locale } = usePreferences();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const notifications = useMemo(() => getNotificationsSeed(locale), [locale]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notifications;

    return notifications.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [notifications, search]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));

  const pageNotifications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNotifications.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredNotifications]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages.slice(0, 5);
  }, [totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, locale]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main
      className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      dir={dir}
    >
      <header className="theme-transition mb-5 rounded-xl bg-hr-surface p-4 shadow-card sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-hr-primary sm:text-2xl">
            {t("notifications.title")}{" "}
            <span className="font-medium text-hr-primary/80">
              | ({filteredNotifications.length}) {t("notifications.countLabel")}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-hr-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("notifications.searchPlaceholder")}
              className="h-11 w-full rounded-full border border-hr-border bg-hr-input-bg pe-4 ps-11 text-sm text-hr-text shadow-sm outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
            />
          </div>
          <AddProjectButton />
        </div>
      </header>

      <section className="hr-card border border-hr-border">
        <div className="divide-y divide-hr-border">
          {pageNotifications.map((item) => (
            <article
              key={item.id}
              className="flex items-start gap-4 px-4 py-4 sm:px-6 sm:py-5"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="mt-1 size-4 shrink-0 rounded border-hr-border text-hr-primary focus:ring-hr-primary/30"
                aria-label={t("notifications.selectItem", { title: item.title })}
              />

              <div className="min-w-0 flex-1">
                <h2 className="mb-1 text-sm font-bold text-hr-text sm:text-base">
                  {item.title}
                </h2>
                <p className="line-clamp-2 text-xs leading-6 text-hr-muted sm:text-sm">
                  {item.description}
                </p>
              </div>

              <time
                dateTime={item.date}
                className="shrink-0 pt-0.5 text-xs text-hr-muted sm:text-sm"
              >
                {item.date}
              </time>
            </article>
          ))}

          {!pageNotifications.length && (
            <div className="px-4 py-12 text-center text-sm text-hr-muted sm:px-6">
              {t("notifications.empty")}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-hr-border px-4 py-4">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
              aria-label={t("table.pagination.previous")}
            >
              ‹
            </button>

            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={[
                  "size-8 rounded-full text-sm transition",
                  page === currentPage
                    ? "bg-hr-primary text-white"
                    : "text-hr-muted hover:bg-hr-hover",
                ].join(" ")}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
              aria-label={t("table.pagination.next")}
            >
              ›
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
