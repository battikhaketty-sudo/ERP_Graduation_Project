import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import { getSectionFlowGate } from "../../services/projects/sectionDependencies";
import { listProjectTasks, sortTasksByPriority } from "../../services/projects";
import type { Project, ProjectSection, ProjectTask } from "../../types/project";
import { accentBtnClass } from "../ui/formStyles";
import { EntityLink } from "../ui/EntityLink";
import { PriorityBadge } from "./ProjectBadges";

const KANBAN_PAGE_SIZE = 8;
const MAX_COLUMN_HEIGHT = "min(28rem, 60vh)";

type ProjectKanbanBoardProps = {
  project: Project;
  onAddSection: () => void;
  onAddTask: () => void;
  onSectionClick?: (section: ProjectSection) => void;
  onTaskClick?: (task: ProjectTask) => void;
};

const gateBadgeClass: Record<string, string> = {
  ready: "bg-sky-500/15 text-sky-500",
};

function TaskCard({
  task,
  completed,
  onClick,
}: {
  task: ProjectTask;
  completed?: boolean;
  onClick?: (task: ProjectTask) => void;
}) {
  const { t } = useTranslation();
  const visibleAssignees = task.assigneeNames.slice(0, 2);
  const extraCount = task.assigneeNames.length - visibleAssignees.length;
  const assignmentBadge =
    task.assignmentCount ??
    (task.assigneeNames.length || task.assigneeIds.length || 0);

  return (
    <div
      className={[
        "w-full rounded-xl border p-3 text-start shadow-sm transition hover:border-hr-primary hover:bg-hr-hover",
        completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-hr-border bg-hr-surface",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onClick?.(task)}
        className="mb-2 flex w-full items-start justify-between gap-2 text-start"
      >
        <h4 className="text-sm font-bold text-hr-primary hover:underline">{task.title}</h4>
        <div className="flex shrink-0 items-center gap-1">
          {completed ? (
            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {t("common.completed")}
            </span>
          ) : null}
          <PriorityBadge priority={task.priority} />
        </div>
      </button>
      {task.description && (
        <button
          type="button"
          onClick={() => onClick?.(task)}
          className="mb-3 w-full text-start"
        >
          <p className="line-clamp-2 text-xs leading-relaxed text-hr-muted">
            {task.description}
          </p>
        </button>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onClick?.(task)}
          className="text-[11px] text-hr-muted"
        >
          {task.dueDate || task.startDate || t("common.dash")}
        </button>
        {visibleAssignees.length ? (
          <div className="flex -space-x-2 space-x-reverse">
            {visibleAssignees.map((name, index) => (
              <EntityLink
                key={`${name}-${index}`}
                to={employeePath(task.assigneeIds[index])}
                title={name}
                className="flex size-7 items-center justify-center rounded-full border-2 border-hr-surface bg-hr-accent-bg text-[10px] font-bold text-hr-primary hover:no-underline"
              >
                {name.charAt(0)}
              </EntityLink>
            ))}
            {extraCount > 0 && (
              <span className="flex size-7 items-center justify-center rounded-full border-2 border-hr-surface bg-hr-hover text-[10px] font-bold text-hr-muted">
                +{extraCount}
              </span>
            )}
          </div>
        ) : assignmentBadge > 0 ? (
          <button
            type="button"
            onClick={() => onClick?.(task)}
            className="flex size-7 items-center justify-center rounded-full bg-hr-accent-bg text-[10px] font-bold text-hr-primary"
          >
            {assignmentBadge}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const mergeTasks = (current: ProjectTask[], incoming: ProjectTask[]) => {
  const seen = new Set(current.map((task) => task.id));
  const next = [...current];
  incoming.forEach((task) => {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    next.push(task);
  });
  return sortTasksByPriority(next);
};

function KanbanColumn({
  projectId,
  section,
  reloadKey,
  onSectionClick,
  onTaskClick,
}: {
  projectId: string;
  section: ProjectSection;
  reloadKey: string;
  onSectionClick?: (section: ProjectSection) => void;
  onTaskClick?: (task: ProjectTask) => void;
}) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append && loadingMoreRef.current) return;
      const requestId = ++requestRef.current;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await listProjectTasks({
          projectId,
          projectSectionId: section.id,
          page: nextPage,
          limit: KANBAN_PAGE_SIZE,
        });
        if (requestId !== requestRef.current) return;

        setTasks((current) =>
          append ? mergeTasks(current, result.records) : sortTasksByPriority(result.records),
        );
        setPage(nextPage);
        setTotal(result.meta.totalItems || result.records.length);
        setHasMore(
          Boolean(result.meta.hasMore) ||
            (result.meta.totalItems > 0 &&
              nextPage * KANBAN_PAGE_SIZE < result.meta.totalItems) ||
            (result.meta.totalItems === 0 &&
              result.records.length === KANBAN_PAGE_SIZE),
        );
      } catch {
        if (requestId !== requestRef.current) return;
        if (!append) {
          setTasks([]);
          setTotal(0);
        }
        setHasMore(false);
      } finally {
        if (requestId !== requestRef.current) return;
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [projectId, section.id],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage, reloadKey]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMore || loading || loadingMoreRef.current) return;
        void loadPage(page + 1, true);
      },
      { root, rootMargin: "48px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadPage, loading, page]);

  const gate = getSectionFlowGate(section, new Map([[section.id, section]]), tasks);

  return (
    <div className="flex min-h-0 flex-col rounded-xl bg-hr-table-head p-3">
      <button
        type="button"
        onClick={() => onSectionClick?.(section)}
        className="mb-3 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-right text-sm font-bold text-hr-text transition hover:bg-hr-hover"
      >
        <span>
          {section.name}
          <span className="mr-2 text-xs font-normal text-hr-muted">
            ({total || tasks.length})
          </span>
          {section.isFinalSection ? (
            <span className="mr-2 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {t("projects.detail.sectionFlow.finalSectionBadge")}
            </span>
          ) : null}
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
      <div
        ref={scrollRef}
        className="min-h-0 space-y-2 overflow-y-auto pe-1"
        style={{ maxHeight: MAX_COLUMN_HEIGHT }}
      >
        {loading ? (
          <p className="rounded-lg bg-hr-surface px-3 py-6 text-center text-xs text-hr-muted">
            {t("common.loading")}
          </p>
        ) : tasks.length ? (
          <>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                completed={section.isFinalSection}
                onClick={onTaskClick}
              />
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore ? (
              <p className="py-2 text-center text-[11px] text-hr-muted">
                {t("projects.kanban.loadingMore")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg bg-hr-surface px-3 py-6 text-center text-xs text-hr-muted">
            {t("common.noData")}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectKanbanBoard({
  project,
  onAddSection,
  onAddTask,
  onSectionClick,
  onTaskClick,
}: ProjectKanbanBoardProps) {
  const { t } = useTranslation();
  const columns = [...project.sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const sectionIds = new Set(columns.map((section) => section.id));
  const orphanTasks = sortTasksByPriority(
    project.tasks.filter(
      (task) => !task.sectionId || !sectionIds.has(task.sectionId),
    ),
  );
  const reloadKey = `${project.id}:${project.tasksCount}:${project.sections
    .map((section) => section.id)
    .join(",")}`;

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
        {columns.length > 0 ? (
          <button
            type="button"
            onClick={onAddTask}
            className={`${accentBtnClass} shrink-0 font-bold`}
          >
            <Plus className="size-4" />
            {t("projects.kanban.addTask")}
          </button>
        ) : null}
      </div>

      {columns.length || orphanTasks.length ? (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((section) => (
            <KanbanColumn
              key={section.id}
              projectId={project.id}
              section={section}
              reloadKey={reloadKey}
              onSectionClick={onSectionClick}
              onTaskClick={onTaskClick}
            />
          ))}

          {orphanTasks.length ? (
            <div className="flex min-h-0 flex-col rounded-xl border border-dashed border-amber-500/40 bg-hr-table-head p-3">
              <p className="mb-3 px-2 py-1 text-sm font-bold text-amber-500">
                {t("projects.kanban.unassigned")}
                <span className="mr-2 text-xs font-normal text-hr-muted">
                  ({orphanTasks.length})
                </span>
              </p>
              <div
                className="min-h-0 space-y-2 overflow-y-auto pe-1"
                style={{ maxHeight: MAX_COLUMN_HEIGHT }}
              >
                {orphanTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-hr-border px-4 py-10 text-center">
          <p className="text-sm text-hr-muted">
            {t("projects.detail.flow.noSections")}
          </p>
          <button
            type="button"
            onClick={onAddSection}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <Plus className="size-4" />
            {t("projects.detail.flow.addFirstSection")}
          </button>
        </div>
      )}
    </section>
  );
}
