import type {
  InvitationStatus,
  ProjectStatus,
  TaskDependencyType,
  TaskPriority,
} from "../../types/project";

export const ProjectStatusApi = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
} as const;

export const ProjectInvitationStatusApi = {
  Pending: 0,
  Accepted: 1,
  Rejected: 2,
  Expired: 3,
  Cancelled: 4,
} as const;

export const ProjectMemberRoleApi = {
  Manager: 0,
  Member: 1,
  Observer: 2,
} as const;

export type ProjectMemberRoleOption = {
  id: number;
  label: string;
};

/** Canonical labels used when sending roles to `roleIdFromLabel`. */
export const PROJECT_MEMBER_ROLES: ProjectMemberRoleOption[] = [
  { id: ProjectMemberRoleApi.Manager, label: "Manager" },
  { id: ProjectMemberRoleApi.Member, label: "Member" },
  { id: ProjectMemberRoleApi.Observer, label: "Observer" },
];

export const PROJECT_INVITE_MEMBER_ROLE_IDS = [
  ProjectMemberRoleApi.Member,
  ProjectMemberRoleApi.Observer,
] as const;

const PROJECT_STATUS_BY_API: Record<number, ProjectStatus> = {
  [ProjectStatusApi.NotStarted]: "not_started",
  [ProjectStatusApi.InProgress]: "in_progress",
  [ProjectStatusApi.Completed]: "completed",
};

const INVITATION_STATUS_BY_API: Record<number, InvitationStatus> = {
  [ProjectInvitationStatusApi.Pending]: "pending",
  [ProjectInvitationStatusApi.Accepted]: "accepted",
  [ProjectInvitationStatusApi.Rejected]: "rejected",
  [ProjectInvitationStatusApi.Expired]: "expired",
  [ProjectInvitationStatusApi.Cancelled]: "cancelled",
};

export const projectStatusToApi = (status: ProjectStatus): number => {
  const map: Record<ProjectStatus, number> = {
    not_started: ProjectStatusApi.NotStarted,
    in_progress: ProjectStatusApi.InProgress,
    completed: ProjectStatusApi.Completed,
  };
  return map[status];
};

export const projectStatusFromApi = (value: unknown): ProjectStatus => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && PROJECT_STATUS_BY_API[numeric]) {
    return PROJECT_STATUS_BY_API[numeric];
  }

  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("complete")) return "completed";
  if (normalized.includes("progress")) return "in_progress";
  if (normalized.includes("not") && normalized.includes("start")) return "not_started";
  return "not_started";
};

/** Forward-only project lifecycle: not_started → in_progress → completed. */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export const projectStatusRank = (status: ProjectStatus) =>
  PROJECT_STATUS_ORDER.indexOf(status);

export const canAdvanceProjectStatus = (
  from: ProjectStatus,
  to: ProjectStatus,
) => projectStatusRank(to) >= projectStatusRank(from);

/** Higher urgency first (urgent/critical → low). */
export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const compareTasksByPriority = <
  T extends { priority: TaskPriority; dueDate?: string; title?: string },
>(
  left: T,
  right: T,
) => {
  const byPriority =
    TASK_PRIORITY_ORDER[left.priority] - TASK_PRIORITY_ORDER[right.priority];
  if (byPriority !== 0) return byPriority;
  const dueLeft = left.dueDate || "";
  const dueRight = right.dueDate || "";
  if (dueLeft !== dueRight) return dueLeft < dueRight ? -1 : 1;
  return (left.title || "").localeCompare(right.title || "", "ar");
};

export const sortTasksByPriority = <
  T extends { priority: TaskPriority; dueDate?: string; title?: string },
>(
  tasks: T[],
) => [...tasks].sort(compareTasksByPriority);

export const invitationStatusFromApi = (value: unknown): InvitationStatus => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && INVITATION_STATUS_BY_API[numeric]) {
    return INVITATION_STATUS_BY_API[numeric];
  }

  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("accept")) return "accepted";
  if (normalized.includes("expir")) return "expired";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("reject")) return "rejected";
  return "pending";
};

const ROLE_LABEL_ALIASES: Record<string, number> = {
  manager: ProjectMemberRoleApi.Manager,
  member: ProjectMemberRoleApi.Member,
  observer: ProjectMemberRoleApi.Observer,
  "مدير مشروع": ProjectMemberRoleApi.Manager,
  "مدير": ProjectMemberRoleApi.Manager,
  عضو: ProjectMemberRoleApi.Member,
  مراقب: ProjectMemberRoleApi.Observer,
};

export const roleLabelFromApi = (value: unknown) => {
  const numeric = Number(value);
  const match = PROJECT_MEMBER_ROLES.find((role) => role.id === numeric);
  if (match) return match.label;
  if (typeof value === "string" && value.trim()) {
    const alias = ROLE_LABEL_ALIASES[value.trim().toLowerCase()] ?? ROLE_LABEL_ALIASES[value.trim()];
    if (alias !== undefined) {
      return PROJECT_MEMBER_ROLES.find((role) => role.id === alias)?.label ?? value;
    }
    return value;
  }
  return "Member";
};

export const roleIdFromLabel = (label: string) => {
  const direct = PROJECT_MEMBER_ROLES.find((role) => role.label === label);
  if (direct) return direct.id;
  const alias = ROLE_LABEL_ALIASES[label] ?? ROLE_LABEL_ALIASES[label.toLowerCase()];
  if (alias !== undefined) return alias;
  return ProjectMemberRoleApi.Member;
};

/** Matches backend `Priority` enum for project tasks. */
export const TaskPriorityApi = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
} as const;

const TASK_PRIORITY_BY_API: Record<number, TaskPriority> = {
  [TaskPriorityApi.Low]: "low",
  [TaskPriorityApi.Medium]: "medium",
  [TaskPriorityApi.High]: "high",
  [TaskPriorityApi.Critical]: "urgent",
};

export const taskPriorityToApi = (priority: TaskPriority): number => {
  const map: Record<TaskPriority, number> = {
    low: TaskPriorityApi.Low,
    medium: TaskPriorityApi.Medium,
    high: TaskPriorityApi.High,
    urgent: TaskPriorityApi.Critical,
  };
  return map[priority];
};

export const taskPriorityFromApi = (value: unknown): TaskPriority => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && TASK_PRIORITY_BY_API[numeric]) {
    return TASK_PRIORITY_BY_API[numeric];
  }
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (normalized.includes("urgent") || normalized.includes("critical")) {
    return "urgent";
  }
  if (normalized.includes("high")) return "high";
  if (normalized.includes("low")) return "low";
  if (normalized.includes("medium") || normalized.includes("med")) return "medium";
  return "medium";
};

/** Matches backend `DependencyType` enum. */
export const TaskDependencyTypeApi = {
  FinishToStart: 0,
  StartToStart: 1,
  FinishToFinish: 2,
  StartToFinish: 3,
} as const;

const DEPENDENCY_TYPE_BY_API: Record<number, TaskDependencyType> = {
  [TaskDependencyTypeApi.FinishToStart]: "finish_to_start",
  [TaskDependencyTypeApi.StartToStart]: "start_to_start",
  [TaskDependencyTypeApi.FinishToFinish]: "finish_to_finish",
  [TaskDependencyTypeApi.StartToFinish]: "start_to_finish",
};

export const taskDependencyTypeToApi = (type: TaskDependencyType = "finish_to_start") => {
  const map: Record<TaskDependencyType, number> = {
    finish_to_start: TaskDependencyTypeApi.FinishToStart,
    start_to_start: TaskDependencyTypeApi.StartToStart,
    finish_to_finish: TaskDependencyTypeApi.FinishToFinish,
    start_to_finish: TaskDependencyTypeApi.StartToFinish,
  };
  return map[type];
};

export const taskDependencyTypeFromApi = (value: unknown): TaskDependencyType => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && DEPENDENCY_TYPE_BY_API[numeric]) {
    return DEPENDENCY_TYPE_BY_API[numeric];
  }
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (normalized.includes("ss") || normalized.includes("starttostart")) {
    return "start_to_start";
  }
  if (normalized.includes("ff") || normalized.includes("finishtofinish")) {
    return "finish_to_finish";
  }
  if (normalized.includes("sf") || normalized.includes("starttofinish")) {
    return "start_to_finish";
  }
  return "finish_to_start";
};
