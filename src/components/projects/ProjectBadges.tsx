import type { InvitationStatus, ProjectStatus, TaskPriority } from "../../types/project";
import {
  INVITATION_STATUS_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "./project-ui";

const projectStatusClasses: Record<ProjectStatus, string> = {
  not_started: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-green-100 text-green-700",
};

const invitationStatusClasses: Record<InvitationStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-orange-100 text-orange-700",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-green-100 text-green-700",
  urgent: "bg-red-100 text-red-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${projectStatusClasses[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${invitationStatusClasses[status]}`}
    >
      {INVITATION_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${priorityClasses[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

const memberRoleClasses: Record<string, string> = {
  "مدير مشروع": "bg-sky-100 text-sky-700",
  "مطور واجهات": "bg-amber-100 text-amber-700",
  "محلل نظم": "bg-violet-100 text-violet-700",
  "مصمم UI/UX": "bg-pink-100 text-pink-700",
  مراقب: "bg-gray-100 text-gray-600",
  عضو: "bg-slate-100 text-slate-600",
};

export function MemberRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        memberRoleClasses[role] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {role}
    </span>
  );
}
