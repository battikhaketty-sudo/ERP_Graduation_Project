import { CheckCircle2, Plus, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { pointsForPriority } from "../../services/projects/performancePoints";
import { getSectionFlowGate } from "../../services/projects/sectionDependencies";
import type {
  Project,
  ProjectSection,
  ProjectTask,
  TaskStatus,
} from "../../types/project";
import { accentBtnClass } from "../ui/formStyles";
import { PriorityBadge, TaskStatusBadge } from "./ProjectBadges";

type ProjectKanbanBoardProps = {
  project: Project;
  onAddSection: () => void;
  onAddTask: () => void;
  onSectionClick?: (section: ProjectSection) => void;
  onSetTaskStatus?: (task: ProjectTask, status: TaskStatus) => void;
};

const gateBadgeClass: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-500",
  ready: "bg-sky-500/15 text-sky-500",
  blocked: "bg-amber-500/15 text-amber-500",
};

function TaskCard({
  task,
  onSetTaskStatus,
}: {
  task: ProjectTask;
  onSetTaskStatus?: (task: ProjectTask, status: TaskStatus) => void;
}) {
  const { t } = useTranslation();
  const visibleAssignees = task.assigneeNames.slice(0, 2);
  const extraCount = task.assigneeNames.length - visibleAssignees.length;
  const isCompleted = task.status === "completed";
  const points = pointsForPriority(task.priority);

  return (
    <article className="rounded-xl border border-hr-border bg-hr-surface p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-hr-text">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-hr-muted">
          {task.description}
        </p>
      )}
      <div className="mb-2">
        <TaskStatusBadge status={task.status} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-hr-muted">
          {task.dueDate || task.startDate || t("common.dash")}
        </span>
        <div className="flex -space-x-2 space-x-reverse">
          {visibleAssignees.map((name, index) => (
            <span
              key={`${name}-${index}`}
              title={name}
              className="flex size-7 items-center justify-center rounded-full border-2 border-hr-surface bg-hr-accent-bg text-[10px] font-bold text-hr-primary"
            >
              {name.charAt(0)}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-hr-surface bg-hr-hover text-[10px] font-bold text-hr-muted">
              +{extraCount}
            </span>
          )}
        </div>
      </div>
      {onSetTaskStatus && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-hr-border pt-2">
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => onSetTaskStatus(task, "completed")}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1.5 text-[11px] font-bold text-emerald-600 transition hover:bg-emerald-500/25 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-3.5" />
              {t("projects.sectionDetail.markComplete")}
              <span className="font-medium opacity-80">
                ({t("projects.sectionDetail.pointsOnComplete", { points })})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSetTaskStatus(task, "todo")}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1.5 text-[11px] font-bold text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-400"
            >
              <RotateCcw className="size-3.5" />
              {t("projects.sectionDetail.reopen")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function ProjectKanbanBoard({
  project,
  onAddSection,
  onAddTask,
  onSectionClick,
  onSetTaskStatus,
}: ProjectKanbanBoardProps) {
  const { t } = useTranslation();
  const columns = [...project.sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const sectionIds = new Set(columns.map((section) => section.id));
  const orphanTasks = project.tasks.filter(
    (task) => !task.sectionId || !sectionIds.has(task.sectionId),
  );
  const sectionsById = useMemo(
    () => new Map(project.sections.map((section) => [section.id, section])),
    [project.sections],
  );

  return (
    <section className="hr-panel">
      <div className="mb-4 flex w-full flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onAddSection}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
        >
          <Plus className="size-4" />
          {t("projects.kanban.addSection")}
        </button>
        <button
          type="button"
          onClick={onAddTask}
          className={`${accentBtnClass} shrink-0 font-bold`}
        >
          <Plus className="size-4" />
          {t("projects.kanban.addTask")}
        </button>
      </div>

      {columns.length || orphanTasks.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((section) => {
            const tasks = project.tasks.filter((task) => task.sectionId === section.id);
            const gate = getSectionFlowGate(section, sectionsById, project.tasks);
            return (
              <div key={section.id} className="rounded-xl bg-hr-table-head p-3">
                <button
                  type="button"
                  onClick={() => onSectionClick?.(section)}
                  className="mb-3 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-right text-sm font-bold text-hr-text transition hover:bg-hr-hover"
                >
                  <span>
                    {section.name}
                    <span className="mr-2 text-xs font-normal text-hr-muted">
                      ({tasks.length})
                    </span>
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      gateBadgeClass[gate],
                    ].join(" ")}
                  >
                    {t(`projects.detail.sectionFlow.gate.${gate}`)}
                  </span>
                </button>
                <div className="space-y-2">
                  {tasks.length ? (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onSetTaskStatus={onSetTaskStatus}
                      />
                    ))
                  ) : (
                    <p className="rounded-lg bg-hr-surface px-3 py-6 text-center text-xs text-hr-muted">
                      {t("common.noData")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {orphanTasks.length ? (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-hr-table-head p-3">
              <p className="mb-3 px-2 py-1 text-sm font-bold text-amber-500">
                {t("projects.kanban.unassigned")}
                <span className="mr-2 text-xs font-normal text-hr-muted">
                  ({orphanTasks.length})
                </span>
              </p>
              <div className="space-y-2">
                {orphanTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSetTaskStatus={onSetTaskStatus}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-hr-border px-4 py-10 text-center text-sm text-hr-muted">
          {t("common.noDataMessage")}
        </p>
      )}
    </section>
  );
}
