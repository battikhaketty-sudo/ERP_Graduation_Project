import type { ProjectTask, TaskStatus } from "../../types/project";

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "completed"];

/** Prefer explicit status; unknown/missing values default to todo. */
export const resolveTaskStatus = (
  task: Pick<ProjectTask, "status" | "sectionId"> & { status?: TaskStatus },
  _sections: Array<{ id: string; name: string }> = [],
): TaskStatus => {
  if (task.status && VALID_STATUSES.includes(task.status)) {
    return task.status;
  }
  return "todo";
};

export const normalizeStoredTask = (
  task: ProjectTask,
  sections: Array<{ id: string; name: string }> = [],
): ProjectTask => ({
  ...task,
  status: resolveTaskStatus(task, sections),
  dependsOnTaskIds: Array.isArray(task.dependsOnTaskIds)
    ? task.dependsOnTaskIds
    : [],
});
