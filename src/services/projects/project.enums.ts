import type { InvitationStatus, ProjectStatus } from "../../types/project";

export type ProjectMemberRoleOption = {
  id: number;
  label: string;
};

export const PROJECT_MEMBER_ROLES: ProjectMemberRoleOption[] = [
  { id: 0, label: "عضو" },
  { id: 1, label: "مدير مشروع" },
  { id: 2, label: "مطور واجهات" },
  { id: 3, label: "محلل نظم" },
  { id: 4, label: "مصمم UI/UX" },
];

export const projectStatusToApi = (status: ProjectStatus): number => {
  const map: Record<ProjectStatus, number> = {
    not_started: 0,
    in_progress: 1,
    completed: 2,
  };
  return map[status];
};

export const projectStatusFromApi = (value: unknown): ProjectStatus => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("complete") || normalized === "2") return "completed";
  if (normalized.includes("progress") || normalized === "1") return "in_progress";
  return "not_started";
};

export const invitationStatusFromApi = (value: unknown): InvitationStatus => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("accept")) return "accepted";
  if (normalized.includes("reject") || normalized.includes("cancel")) return "rejected";
  return "pending";
};

export const roleLabelFromApi = (value: unknown) => {
  const numeric = Number(value);
  const match = PROJECT_MEMBER_ROLES.find((role) => role.id === numeric);
  if (match) return match.label;
  if (typeof value === "string" && value.trim()) return value;
  return "عضو";
};

export const roleIdFromLabel = (label: string) =>
  PROJECT_MEMBER_ROLES.find((role) => role.label === label)?.id ?? 0;
