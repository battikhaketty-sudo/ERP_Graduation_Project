import type {
  InvitationStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "../../types/project";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { STATUS_BADGE_CLASS } from "../ui/formStyles";

const projectStatusClasses: Record<ProjectStatus, string> = {
  not_started: STATUS_BADGE_CLASS.warning,
  in_progress: STATUS_BADGE_CLASS.info,
  completed: STATUS_BADGE_CLASS.success,
};

const invitationStatusClasses: Record<InvitationStatus, string> = {
  pending: STATUS_BADGE_CLASS.warning,
  accepted: STATUS_BADGE_CLASS.success,
  rejected: STATUS_BADGE_CLASS.error,
  expired: STATUS_BADGE_CLASS.neutral,
  cancelled: STATUS_BADGE_CLASS.neutral,
};

const priorityClasses: Record<TaskPriority, string> = {
  low: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  medium: STATUS_BADGE_CLASS.info,
  high: STATUS_BADGE_CLASS.success,
  urgent: STATUS_BADGE_CLASS.error,
};

const taskStatusClasses: Record<TaskStatus, string> = {
  todo: STATUS_BADGE_CLASS.neutral,
  in_progress: STATUS_BADGE_CLASS.info,
  completed: STATUS_BADGE_CLASS.success,
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { projectStatusLabel } = useProjectLabels();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${projectStatusClasses[status]}`}
    >
      {projectStatusLabel(status)}
    </span>
  );
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const { invitationStatusLabel } = useProjectLabels();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${invitationStatusClasses[status]}`}
    >
      {invitationStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { priorityLabel } = useProjectLabels();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${priorityClasses[priority]}`}
    >
      {priorityLabel(priority)}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { taskStatusLabel } = useProjectLabels();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${taskStatusClasses[status]}`}
    >
      {taskStatusLabel(status)}
    </span>
  );
}

const memberRoleClasses: Record<string, string> = {
  Manager: STATUS_BADGE_CLASS.info,
  "مدير مشروع": STATUS_BADGE_CLASS.info,
  مدير: STATUS_BADGE_CLASS.info,
  Member: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  عضو: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  Observer: STATUS_BADGE_CLASS.neutral,
  مراقب: STATUS_BADGE_CLASS.neutral,
};

export function MemberRoleBadge({ role }: { role: string }) {
  const { memberRoleLabel } = useProjectLabels();
  const displayRole = memberRoleLabel(role);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        memberRoleClasses[role] ?? memberRoleClasses[displayRole] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
      }`}
    >
      {displayRole}
    </span>
  );
}
