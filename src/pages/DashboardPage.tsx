import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  FolderKanban,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { hrDepartmentsPath, ROUTES } from "../constants/routes";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboard/dashboard.service";
import { getThrownErrorMessage } from "../utils/apiResponse";
import { StatusBanner } from "../components/ui/StatusBanner";
import { cardSurfaceClass } from "../components/ui/formStyles";
import {
  InvitationStatusBadge,
  ProjectStatusBadge,
} from "../components/projects/ProjectBadges";
import { useProjectLabels } from "../hooks/useProjectLabels";

const emptySummary = (): DashboardSummary => ({
  projectsCount: 0,
  tasksCount: 0,
  employeesCount: 0,
  invitationsCount: 0,
  projects: [],
  tasks: [],
  invitations: [],
});

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { priorityLabel } = useProjectLabels();
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
      key: "projects",
      label: t("dashboard.kpi.projects"),
      value: summary.projectsCount,
      icon: FolderKanban,
      tone: "text-sky-600",
      ring: "border-sky-400",
      href: ROUTES.projects,
    },
    {
      key: "tasks",
      label: t("dashboard.kpi.tasks"),
      value: summary.tasksCount,
      icon: ClipboardList,
      tone: "text-emerald-600",
      ring: "border-emerald-400",
      href: ROUTES.projects,
    },
    {
      key: "employees",
      label: t("dashboard.kpi.employees"),
      value: summary.employeesCount,
      icon: Users,
      tone: "text-violet-600",
      ring: "border-violet-400",
      href: ROUTES.employees,
    },
    {
      key: "invitations",
      label: t("dashboard.kpi.invitations"),
      value: summary.invitationsCount,
      icon: ClipboardList,
      tone: "text-amber-600",
      ring: "border-amber-400",
      href: `${ROUTES.projects}?tab=invitations`,
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
      onClick: () => navigate(hrDepartmentsPath),
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
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <button
                  key={kpi.key}
                  type="button"
                  onClick={() => navigate(kpi.href)}
                  className={`rounded-2xl border-b-4 bg-hr-surface p-4 text-start shadow-card ${kpi.ring}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Icon className={`size-5 ${kpi.tone}`} />
                  </div>
                  <p className={`text-2xl font-bold ${kpi.tone}`}>
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-sm text-hr-muted">{kpi.label}</p>
                </button>
              );
            })}
          </section>

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
            <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-hr-text">
                    {t("dashboard.projects.title")}
                  </h2>
                  <p className="mt-0.5 text-xs text-hr-muted">
                    {t("dashboard.projects.subtitle")}
                  </p>
                </div>
                <Link
                  to={ROUTES.projects}
                  className="text-xs font-semibold text-hr-primary hover:underline"
                >
                  {t("dashboard.viewAll")}
                </Link>
              </div>
              {summary.projects.length ? (
                <ul className="divide-y divide-hr-border">
                  {summary.projects.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${ROUTES.projects}?id=${encodeURIComponent(project.id)}`,
                          )
                        }
                        className="flex w-full items-start justify-between gap-3 py-3 text-start transition hover:bg-hr-hover/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-hr-text">
                            {project.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-hr-muted">
                            {project.managerName}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <ProjectStatusBadge status={project.status} />
                          <p className="mt-1 text-[11px] text-hr-muted">
                            {project.endDate || t("common.dash")}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-hr-muted">
                  {t("dashboard.projects.empty")}
                </p>
              )}
            </section>

            <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-hr-text">
                  {t("dashboard.tasks.title")}
                </h2>
                <p className="mt-0.5 text-xs text-hr-muted">
                  {t("dashboard.tasks.subtitle")}
                </p>
              </div>
              {summary.tasks.length ? (
                <ul className="divide-y divide-hr-border">
                  {summary.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-hr-text">
                          {task.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-hr-muted">
                          {task.sectionName || t("common.dash")}
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-hr-muted">
                  {t("dashboard.tasks.empty")}
                </p>
              )}
            </section>
          </div>

          <section className={`${cardSurfaceClass} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-hr-text">
                  {t("dashboard.invitations.title")}
                </h2>
                <p className="mt-0.5 text-xs text-hr-muted">
                  {t("dashboard.invitations.subtitle")}
                </p>
              </div>
              <Link
                to={`${ROUTES.projects}?tab=invitations`}
                className="text-xs font-semibold text-hr-primary hover:underline"
              >
                {t("dashboard.viewAll")}
              </Link>
            </div>
            {summary.invitations.length ? (
              <ul className="divide-y divide-hr-border">
                {summary.invitations.map((invitation) => (
                  <li key={invitation.id}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `${ROUTES.projects}?id=${encodeURIComponent(invitation.projectId)}`,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 py-3 text-start transition hover:bg-hr-hover/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-hr-text">
                          {invitation.projectName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-hr-muted">
                          {invitation.role}
                        </p>
                      </div>
                      <InvitationStatusBadge status={invitation.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-hr-muted">
                {t("dashboard.invitations.empty")}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
