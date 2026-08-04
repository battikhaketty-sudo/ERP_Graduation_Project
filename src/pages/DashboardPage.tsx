import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardList,
  FolderKanban,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { ROUTES } from "../constants/routes";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboard/dashboard.service";
import { getThrownErrorMessage } from "../utils/apiResponse";
import { StatusBanner } from "../components/ui/StatusBanner";
import { cardSurfaceClass } from "../components/ui/formStyles";
import { ProjectStatusBadge } from "../components/projects/ProjectBadges";
import type { ProjectStatus } from "../types/project";
import { useProjectLabels } from "../hooks/useProjectLabels";

const emptySummary = (): DashboardSummary => ({
  activeProjects: 0,
  overdueTasks: 0,
  dueThisWeek: 0,
  pendingFollowUps: 0,
  completionRate: 0,
  overdueProjects: 0,
  projectProgress: [],
  urgentTasks: [],
  activities: [],
  alerts: [],
});

function ProgressBar({ value, overdue }: { value: number; overdue?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-hr-border">
      <div
        className={[
          "h-full rounded-full transition-all",
          overdue ? "bg-red-500" : "bg-hr-primary",
        ].join(" ")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { priorityLabel, projectStatusLabel } = useProjectLabels();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          setError(getThrownErrorMessage(err, t("dashboard.loadError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const kpis = [
    {
      key: "activeProjects",
      label: t("dashboard.kpi.activeProjects"),
      value: summary.activeProjects,
      icon: FolderKanban,
      tone: "text-sky-600",
      ring: "border-sky-400",
    },
    {
      key: "overdueTasks",
      label: t("dashboard.kpi.overdueTasks"),
      value: summary.overdueTasks,
      icon: AlertTriangle,
      tone: "text-red-500",
      ring: "border-red-400",
    },
    {
      key: "dueThisWeek",
      label: t("dashboard.kpi.dueThisWeek"),
      value: summary.dueThisWeek,
      icon: ClipboardList,
      tone: "text-emerald-600",
      ring: "border-emerald-400",
    },
    {
      key: "pendingFollowUps",
      label: t("dashboard.kpi.pendingFollowUps"),
      value: summary.pendingFollowUps,
      icon: Users,
      tone: "text-amber-600",
      ring: "border-amber-400",
    },
  ];

  const shortcuts = [
    {
      key: "addProject",
      label: t("dashboard.shortcuts.addProject"),
      icon: Plus,
      onClick: () => navigate(`${ROUTES.projects}?add=1`),
    },
    {
      key: "addEmployee",
      label: t("dashboard.shortcuts.addEmployee"),
      icon: UserPlus,
      onClick: () => navigate(`${ROUTES.employees}?add=1`),
    },
    {
      key: "invitations",
      label: t("dashboard.shortcuts.invitations"),
      icon: ClipboardList,
      onClick: () => navigate(`${ROUTES.projects}?tab=invitations`),
    },
    {
      key: "hr",
      label: t("dashboard.shortcuts.attendance"),
      icon: Building2,
      onClick: () => navigate(ROUTES.hr),
    },
    {
      key: "departments",
      label: t("dashboard.shortcuts.departments"),
      icon: FolderKanban,
      onClick: () => navigate(ROUTES.departments),
    },
    {
      key: "notifications",
      label: t("dashboard.shortcuts.notifications"),
      icon: Bell,
      onClick: () => navigate(ROUTES.notifications),
    },
  ];

  return (
    <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-hr-muted">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <p className="rounded-xl bg-hr-surface px-3 py-2 text-xs font-medium text-hr-muted shadow-sm">
          {t("dashboard.completionRate", { percent: summary.completionRate })}
        </p>
      </div>

      {error ? (
        <StatusBanner variant="error" message={error} className="mb-4" />
      ) : null}

      {loading ? (
        <div
          className={`${cardSurfaceClass} p-10 text-center text-sm text-hr-muted`}
        >
          {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Alerts — what needs attention in 10 seconds */}
          {summary.alerts.length ? (
            <section className="flex flex-wrap gap-2">
              {summary.alerts.includes("overdueProjects") ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">
                  <AlertTriangle className="size-3.5" />
                  {t("dashboard.alerts.overdueProjects", {
                    count: summary.overdueProjects,
                  })}
                </span>
              ) : null}
              {summary.alerts.includes("overdueTasks") ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">
                  <AlertTriangle className="size-3.5" />
                  {t("dashboard.alerts.overdueTasks", {
                    count: summary.overdueTasks,
                  })}
                </span>
              ) : null}
              {summary.alerts.includes("pendingInvites") ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  {t("dashboard.alerts.pendingInvites", {
                    count: summary.pendingFollowUps,
                  })}
                </span>
              ) : null}
            </section>
          ) : (
            <section className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              {t("dashboard.alerts.allClear")}
            </section>
          )}

          {/* KPI row */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.key}
                  className={`rounded-2xl border-b-4 bg-hr-surface p-4 shadow-card ${kpi.ring}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Icon className={`size-5 ${kpi.tone}`} />
                  </div>
                  <p className={`text-2xl font-bold ${kpi.tone}`}>
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-sm text-hr-muted">{kpi.label}</p>
                </div>
              );
            })}
          </section>

          {/* Quick shortcuts */}
          <section className={`${cardSurfaceClass} p-4`}>
            <h2 className="mb-3 text-sm font-bold text-hr-text">
              {t("dashboard.shortcuts.title")}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-hr-border bg-hr-table-alt px-3 text-sm font-semibold text-hr-text transition hover:border-hr-primary hover:bg-hr-hover"
                  >
                    <Icon className="size-4 text-hr-primary" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Project progress — simple bars, not a heavy chart */}
            <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-hr-text">
                    {t("dashboard.progress.title")}
                  </h2>
                  <p className="mt-0.5 text-xs text-hr-muted">
                    {t("dashboard.progress.subtitle")}
                  </p>
                </div>
                <Link
                  to={ROUTES.projects}
                  className="text-xs font-semibold text-hr-primary hover:underline"
                >
                  {t("dashboard.viewAll")}
                </Link>
              </div>
              {summary.projectProgress.length ? (
                <ul className="space-y-4">
                  {summary.projectProgress.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${ROUTES.projects}?id=${encodeURIComponent(project.id)}`,
                          )
                        }
                        className="w-full text-start"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-hr-text">
                            {project.name}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-hr-muted">
                            {project.progress}%
                          </span>
                        </div>
                        <ProgressBar
                          value={project.progress}
                          overdue={project.overdue}
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <ProjectStatusBadge status={project.status} />
                          <span
                            className={[
                              "text-[11px]",
                              project.overdue
                                ? "font-semibold text-red-500"
                                : "text-hr-muted",
                            ].join(" ")}
                          >
                            {project.endDate
                              ? t("dashboard.progress.deadline", {
                                  date: project.endDate,
                                })
                              : t("common.dash")}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-hr-muted">
                  {t("dashboard.progress.empty")}
                </p>
              )}
            </section>

            {/* Urgent tasks today */}
            <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-hr-text">
                  {t("dashboard.urgent.title")}
                </h2>
                <p className="mt-0.5 text-xs text-hr-muted">
                  {t("dashboard.urgent.subtitle")}
                </p>
              </div>
              {summary.urgentTasks.length ? (
                <ul className="divide-y divide-hr-border">
                  {summary.urgentTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${ROUTES.projects}?id=${encodeURIComponent(task.projectId)}`,
                          )
                        }
                        className="flex w-full items-start justify-between gap-3 py-3 text-start transition hover:bg-hr-hover/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-hr-text">
                            {task.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-hr-muted">
                            {task.projectName}
                            {task.assigneeNames[0]
                              ? ` · ${task.assigneeNames[0]}`
                              : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-[11px] font-medium text-hr-muted">
                            {task.dueDate || t("common.dash")}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-hr-primary">
                            {priorityLabel(task.priority)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-hr-muted">
                  {t("dashboard.urgent.empty")}
                </p>
              )}
            </section>
          </div>

          {/* Recent activity — compact list, not a table */}
          <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-hr-text">
                  {t("dashboard.activity.title")}
                </h2>
                <p className="mt-0.5 text-xs text-hr-muted">
                  {t("dashboard.activity.subtitle")}
                </p>
              </div>
            </div>
            {summary.activities.length ? (
              <ul className="divide-y divide-hr-border">
                {summary.activities.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.href && navigate(item.href)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-start transition hover:bg-hr-hover/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-hr-text">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-hr-muted">
                          {item.kind === "invitation"
                            ? t("dashboard.activity.invitation", {
                                detail: item.detail,
                              })
                            : t("dashboard.activity.project", {
                                detail: projectStatusLabel(
                                  item.detail as ProjectStatus,
                                ),
                              })}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-hr-muted">
                        {item.at
                          ? String(item.at).slice(0, 10)
                          : t("common.dash")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-hr-muted">
                {t("dashboard.activity.empty")}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
