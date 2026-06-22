import { Plus } from "lucide-react";
import type { Project, ProjectSection, ProjectTask } from "../../types/project";
import { PriorityBadge } from "./ProjectBadges";

type ProjectKanbanBoardProps = {
  project: Project;
  onAddSection: () => void;
  onAddTask: () => void;
  onSectionClick?: (section: ProjectSection) => void;
};

function TaskCard({ task }: { task: ProjectTask }) {
  const visibleAssignees = task.assigneeNames.slice(0, 2);
  const extraCount = task.assigneeNames.length - visibleAssignees.length;

  return (
    <article className="rounded-xl border border-hr-border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-hr-text">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-hr-muted">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-hr-muted">{task.dueDate || task.startDate || "—"}</span>
        <div className="flex -space-x-2 space-x-reverse">
          {visibleAssignees.map((name, index) => (
            <span
              key={`${name}-${index}`}
              title={name}
              className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#E8F4FD] text-[10px] font-bold text-[#2F80ED]"
            >
              {name.charAt(0)}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-hr-muted">
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
  const columns = [...project.sections].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onAddSection}
          className="rounded-xl bg-[#F5A623] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#E8940A]"
        >
          + إضافة قسم جديد
        </button>
        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex items-center gap-2 rounded-xl border border-[#9FD4EF] bg-[#E9F6FC] px-4 py-2 text-sm font-bold text-[#1B91C4] transition hover:bg-[#D6EFFA]"
        >
          <Plus className="size-4" />
          إضافة مهمة جديدة
        </button>
      </div>

      {columns.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((section) => {
            const tasks = project.tasks.filter((task) => task.sectionId === section.id);
            return (
              <div key={section.id} className="rounded-xl bg-[#F5FAFD] p-3">
                <button
                  type="button"
                  onClick={() => onSectionClick?.(section)}
                  className="mb-3 w-full rounded-lg px-2 py-1 text-right text-sm font-bold text-hr-text transition hover:bg-white/70"
                >
                  {section.name}
                  <span className="mr-2 text-xs font-normal text-hr-muted">({tasks.length})</span>
                </button>
                <div className="space-y-2">
                  {tasks.length ? (
                    tasks.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <p className="rounded-lg bg-white px-3 py-6 text-center text-xs text-hr-muted">
                      لا توجد مهام
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-hr-border px-4 py-10 text-center text-sm text-hr-muted">
          لا توجد أقسام. أضف قسماً جديداً لبدء لوحة كانبان.
        </p>
      )}
    </section>
  );
}
