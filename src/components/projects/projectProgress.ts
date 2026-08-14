import type {
  Project,
  ProjectSection,
  ProjectTask,
  TaskStats,
} from "../../types/project";
import { buildTaskStatsFromTasks } from "../../services/projects/taskStorage";

export type SectionFlowItem = {
  id: string;
  name: string;
  taskCount: number;
  isActive: boolean;
  /** Visual stage for node styling */
  stage: "idle" | "busy";
};

export type StatusDistributionItem = {
  key: "onTrack" | "late";
  count: number;
  percent: number;
};

export type TimelineProgress = {
  hasRange: boolean;
  elapsedPercent: number;
  isOverdue: boolean;
  startLabel: string;
  endLabel: string;
};

export type ProjectProgressSnapshot = {
  completionPercent: number;
  taskStats: TaskStats;
  sectionFlow: SectionFlowItem[];
  statusDistribution: StatusDistributionItem[];
  timeline: TimelineProgress;
};

/** Compare by calendar day (YYYY-MM-DD) to avoid timezone false overdue. */
const toDayKey = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 10);
};

const dayKeyToLocalDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDateLabel = (value?: string) => {
  if (!value?.trim()) return "—";
  return value.slice(0, 10);
};

/** Progress from project status / timeline — not task completion. */
export const getCompletionPercent = (
  project: Pick<Project, "status" | "startDate" | "endDate">,
  tasks: ProjectTask[] = [],
) => {
  if (project.status === "completed") return 100;
  if (project.status === "not_started" && !tasks.length) return 0;

  const timeline = buildTimelineProgress(
    project.startDate,
    project.endDate,
    tasks,
  );
  if (timeline.hasRange) {
    if (project.status === "not_started") {
      return Math.min(25, timeline.elapsedPercent);
    }
    return Math.min(95, Math.max(10, timeline.elapsedPercent));
  }

  return project.status === "in_progress" ? 45 : 0;
};

export const buildSectionFlow = (
  sections: ProjectSection[],
  tasks: ProjectTask[],
): SectionFlowItem[] => {
  const ordered = [...sections].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  const tasksBySection = new Map<string, ProjectTask[]>();
  tasks.forEach((task) => {
    const list = tasksBySection.get(task.sectionId) ?? [];
    list.push(task);
    tasksBySection.set(task.sectionId, list);
  });

  const maxCount = Math.max(
    0,
    ...Array.from(tasksBySection.values()).map((list) => list.length),
  );

  return ordered.map((section) => {
    const sectionTasks = tasksBySection.get(section.id) ?? [];
    const taskCount = sectionTasks.length;

    return {
      id: section.id,
      name: section.name,
      taskCount,
      isActive: taskCount > 0 && taskCount === maxCount && maxCount > 0,
      stage: taskCount > 0 ? "busy" : "idle",
    };
  });
};

export const buildStatusDistribution = (
  taskStats: TaskStats,
): StatusDistributionItem[] => {
  const onTrack = Math.max(0, taskStats.total - taskStats.late);
  const rows: Array<Omit<StatusDistributionItem, "percent">> = [
    { key: "onTrack", count: onTrack },
    { key: "late", count: taskStats.late },
  ];

  return rows.map((row) => ({
    ...row,
    percent: taskStats.total
      ? Math.round((row.count / taskStats.total) * 100)
      : 0,
  }));
};

export const buildTimelineProgress = (
  startDate?: string,
  endDate?: string,
  tasks: ProjectTask[] = [],
): TimelineProgress => {
  const dayKeys: string[] = [];
  const pushKey = (value?: string | null) => {
    const key = toDayKey(value);
    if (key) dayKeys.push(key);
  };

  pushKey(startDate);
  pushKey(endDate);
  tasks.forEach((task) => {
    pushKey(task.startDate);
    pushKey(task.dueDate);
  });

  const startKey = dayKeys.length ? dayKeys.reduce((a, b) => (a < b ? a : b)) : null;
  const endKey = dayKeys.length ? dayKeys.reduce((a, b) => (a > b ? a : b)) : null;
  const startLabel = startKey ?? formatDateLabel(startDate);
  const endLabel = endKey ?? formatDateLabel(endDate);

  if (!startKey || !endKey || endKey < startKey) {
    return {
      hasRange: false,
      elapsedPercent: 0,
      isOverdue: false,
      startLabel,
      endLabel,
    };
  }

  const start = dayKeyToLocalDate(startKey);
  const end = dayKeyToLocalDate(endKey);
  const todayKey = toDayKey(new Date())!;
  const today = dayKeyToLocalDate(todayKey);

  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  const elapsedPercent =
    total <= 0
      ? todayKey >= endKey
        ? 100
        : 0
      : Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));

  return {
    hasRange: true,
    elapsedPercent,
    isOverdue: todayKey > endKey,
    startLabel,
    endLabel,
  };
};

/** Soft list progress when full task stats may be unavailable. */
export const getProjectListProgressPercent = (project: Project): number =>
  getCompletionPercent(project, project.tasks ?? []);

export const buildProjectProgressSnapshot = (
  project: Project,
  taskStats: TaskStats,
): ProjectProgressSnapshot => ({
  completionPercent: getCompletionPercent(project, project.tasks ?? []),
  taskStats,
  sectionFlow: buildSectionFlow(project.sections, project.tasks ?? []),
  statusDistribution: buildStatusDistribution(taskStats),
  timeline: buildTimelineProgress(
    project.startDate,
    project.endDate,
    project.tasks ?? [],
  ),
});
