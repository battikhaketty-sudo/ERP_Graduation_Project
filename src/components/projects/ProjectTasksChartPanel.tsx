import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import type { Project, ProjectTask } from "../../types/project";
import { cardSurfaceClass } from "../ui/formStyles";
import { EntityLink } from "../ui/EntityLink";
import { TableAddButton } from "../ui/TableToolbar";
import { formatTaskDate } from "./projectChart";

type ProjectTasksChartPanelProps = {
  project: Project;
  onAddTask?: (sectionId?: string) => void;
  onTaskClick?: (task: ProjectTask) => void;
};

export function ProjectTasksChartPanel({
  project,
  onAddTask,
  onTaskClick,
}: ProjectTasksChartPanelProps) {
  const { t } = useTranslation();
  const tasks = project.tasks ?? [];

  return (
    <section className={`mb-5 ${cardSurfaceClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hr-border bg-hr-table-alt px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-hr-text">
            {t("projects.detail.chart.title")}
          </h3>
          <p className="mt-1 text-sm text-hr-muted">
            {t("projects.detail.chart.subtitle")}
          </p>
        </div>
        {onAddTask ? (
          <TableAddButton
            label={t("projects.detail.chart.addTask")}
            onClick={() => onAddTask()}
          />
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-hr-table-alt text-hr-muted">
              <th className="px-3 py-2.5 text-start text-xs font-medium">
                {t("projects.detail.chart.columns.description")}
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap">
                {t("projects.detail.chart.columns.planStart")}
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap">
                {t("projects.detail.chart.columns.planEnd")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.length ? (
              tasks.map((task, index) => {
                const assignee = task.assigneeNames[0];
                const assigneeId = task.assigneeIds[0];
                return (
                  <tr
                    key={task.id}
                    className={
                      index % 2 ? "bg-hr-table-alt/40" : "bg-hr-surface"
                    }
                  >
                    <td className="max-w-[220px] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {onTaskClick ? (
                          <button
                            type="button"
                            onClick={() => onTaskClick(task)}
                            className="truncate font-medium text-hr-primary hover:underline"
                            title={task.title || task.name}
                          >
                            {task.title || task.name || t("common.dash")}
                          </button>
                        ) : (
                          <span
                            className="truncate font-medium text-hr-text"
                            title={task.title || task.name}
                          >
                            {task.title || task.name || t("common.dash")}
                          </span>
                        )}
                        {assignee ? (
                          <EntityLink
                            to={employeePath(assigneeId)}
                            className="shrink-0 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-amber-500 hover:no-underline"
                          >
                            {assignee}
                          </EntityLink>
                        ) : null}
                      </div>
                    </td>
                    <td
                      className="px-3 py-2.5 text-center text-xs text-hr-muted whitespace-nowrap"
                      dir="ltr"
                    >
                      {formatTaskDate(task.startDate) || t("common.dash")}
                    </td>
                    <td
                      className="px-3 py-2.5 text-center text-xs text-hr-muted whitespace-nowrap"
                      dir="ltr"
                    >
                      {formatTaskDate(task.dueDate) || t("common.dash")}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-sm text-hr-muted"
                >
                  {t("projects.detail.chart.noTasks")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
