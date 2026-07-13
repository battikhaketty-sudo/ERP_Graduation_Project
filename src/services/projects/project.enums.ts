import type { InvitationStatus, ProjectStatus } from "../../types/project";

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
