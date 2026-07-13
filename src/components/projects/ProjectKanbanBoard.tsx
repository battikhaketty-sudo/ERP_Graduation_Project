import { Plus } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { Project, ProjectSection, ProjectTask } from "../../types/project";
import { accentBtnClass } from "../ui/formStyles";
import { PriorityBadge } from "./ProjectBadges";

type ProjectKanbanBoardProps = {
  project: Project;
  onAddSection: () => void;
  onAddTask: () => void;
  onSectionClick?: (section: ProjectSection) => void;
};

function TaskCard({ task }: { task: ProjectTask }) {
  const { t } = useTranslation();
  const visibleAssignees = task.assigneeNames.slice(0, 2);
  const extraCount = task.assigneeNames.length - visibleAssignees.length;

  return (
    <article className="rounded-xl border border-hr-border bg-hr-surface p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-hr-text">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-hr-muted">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
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
    </article>
  );
}

export function ProjectKanbanBoard({
  project,
  onAddSection,
  onAddTask,
  onSectionClick,
}: ProjectKanbanBoardProps) {
  const { t } = useTranslation();
  const columns = [...project.sections].sort((a, b) => a.displayOrder - b.displayOrder);

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

      {columns.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((section) => {
            const tasks = project.tasks.filter((task) => task.sectionId === section.id);
            return (
              <div key={section.id} className="rounded-xl bg-hr-table-head p-3">
                <button
                  type="button"
                  onClick={() => onSectionClick?.(section)}
                  className="mb-3 w-full rounded-lg px-2 py-1 text-right text-sm font-bold text-hr-text transition hover:bg-hr-hover"
                >
                  {section.name}
                  <span className="mr-2 text-xs font-normal text-hr-muted">({tasks.length})</span>
                </button>
                <div className="space-y-2">
                  {tasks.length ? (
                    tasks.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <p className="rounded-lg bg-hr-surface px-3 py-6 text-center text-xs text-hr-muted">
                      {t("common.noData")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-hr-border px-4 py-10 text-center text-sm text-hr-muted">
          {t("common.noDataMessage")}
        </p>
      )}
    </section>
  );
}
