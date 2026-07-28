import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useTranslation } from "../../i18n";
import {
  getProjectPointsEntries,
  getProjectPointsLeaderboardWithGlobal,
  pointsForPriority,
  reconcileProjectPoints,
} from "../../services/projects/performancePoints";
import { cardSurfaceClass } from "../ui/formStyles";
import type { Project } from "../../types/project";

type ProjectPerformancePanelProps = {
  project: Project;
  revision?: string;
};

export function ProjectPerformancePanel({
  project,
  revision = "",
}: ProjectPerformancePanelProps) {
  const { t } = useTranslation();
  const [reconciledAt, setReconciledAt] = useState(0);

  useEffect(() => {
    reconcileProjectPoints(project);
    setReconciledAt(Date.now());
  }, [project, revision]);

  const leaderboard = useMemo(
    () => getProjectPointsLeaderboardWithGlobal(project.id),
    [project.id, revision, reconciledAt],
  );

  const recent = useMemo(
    () => getProjectPointsEntries(project.id).slice(0, 8),
    [project.id, revision, reconciledAt],
  );

  const totalPoints = leaderboard.reduce((sum, row) => sum + row.totalPoints, 0);

  return (
    <section className={`mb-5 ${cardSurfaceClass} overflow-hidden`}>
      <div className="border-b border-hr-border bg-hr-table-alt px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Trophy className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-hr-text">
              {t("projects.detail.performance.title")}
            </h3>
            <p className="mt-1 text-sm text-hr-muted">
              {t("projects.detail.performance.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-hr-border bg-hr-surface p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-hr-text">
              {t("projects.detail.performance.leaderboard")}
            </p>
            <p className="text-xs text-hr-muted">
              {t("projects.detail.performance.totalPoints", { count: totalPoints })}
            </p>
          </div>

          {leaderboard.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-hr-muted">
                    <th className="px-2 py-2 text-start text-xs font-medium">#</th>
                    <th className="px-2 py-2 text-start text-xs font-medium">
                      {t("projects.detail.performance.columns.employee")}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium">
                      {t("projects.detail.performance.columns.tasks")}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium">
                      {t("projects.detail.performance.columns.points")}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium">
                      {t("projects.detail.performance.columns.allProjects")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => (
                    <tr
                      key={row.employeeId}
                      className={index % 2 ? "bg-hr-table-alt/40" : undefined}
                    >
                      <td className="px-2 py-2.5 text-xs text-hr-muted">{index + 1}</td>
                      <td className="px-2 py-2.5 font-medium text-hr-text">
                        {row.employeeName}
                      </td>
                      <td className="px-2 py-2.5 text-center text-hr-muted">
                        {row.completedTasks}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-amber-500">
                        {row.totalPoints}
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold text-hr-primary">
                        {row.allProjectsPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-hr-muted">
              {t("projects.detail.performance.empty")}
            </p>
          )}
          <p className="mt-3 text-[11px] text-hr-muted">
            {t("projects.detail.performance.multiProjectHint")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-hr-border bg-hr-surface p-4">
            <p className="mb-3 text-sm font-medium text-hr-text">
              {t("projects.detail.performance.rulesTitle")}
            </p>
            <ul className="space-y-2 text-xs text-hr-muted">
              <li>
                {t("projects.detail.performance.rules.low", {
                  points: pointsForPriority("low"),
                })}
              </li>
              <li>
                {t("projects.detail.performance.rules.medium", {
                  points: pointsForPriority("medium"),
                })}
              </li>
              <li>
                {t("projects.detail.performance.rules.high", {
                  points: pointsForPriority("high"),
                })}
              </li>
              <li>
                {t("projects.detail.performance.rules.urgent", {
                  points: pointsForPriority("urgent"),
                })}
              </li>
              <li>{t("projects.detail.performance.rules.assignees")}</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-hr-border bg-hr-surface p-4">
            <p className="mb-3 text-sm font-medium text-hr-text">
              {t("projects.detail.performance.recent")}
            </p>
            {recent.length ? (
              <ul className="space-y-2">
                {recent.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-hr-border/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-hr-text">
                        {entry.employeeName}
                      </p>
                      <p className="truncate text-[11px] text-hr-muted">{entry.taskTitle}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-amber-500">
                      +{entry.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-hr-muted">
                {t("projects.detail.performance.recentEmpty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
