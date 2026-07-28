import { useCallback, useMemo } from "react";
import { useTranslation } from "../i18n";
import type { TranslationKey } from "../i18n";
import {
  PROJECT_INVITE_MEMBER_ROLE_IDS,
  PROJECT_MEMBER_ROLES,
} from "../services/projects";
import type {
  InvitationStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "../types/project";

const MEMBER_ROLE_KEYS: Record<number, TranslationKey> = {
  0: "badges.memberRoles.manager",
  1: "badges.memberRoles.member",
  2: "badges.memberRoles.observer",
};

const MEMBER_ROLE_LABEL_TO_KEY: Record<string, TranslationKey> = {
  Manager: "badges.memberRoles.manager",
  Member: "badges.memberRoles.member",
  Observer: "badges.memberRoles.observer",
  "مدير مشروع": "badges.memberRoles.manager",
  مدير: "badges.memberRoles.manager",
  عضو: "badges.memberRoles.member",
  مراقب: "badges.memberRoles.observer",
};

export function useProjectLabels() {
  const { t } = useTranslation();

  const projectStatusLabel = useCallback(
    (status: ProjectStatus) => t(`badges.projectStatus.${status}`),
    [t],
  );

  const invitationStatusLabel = useCallback(
    (status: InvitationStatus) => t(`badges.invitationStatus.${status}`),
    [t],
  );

  const priorityLabel = useCallback(
    (priority: TaskPriority) => t(`badges.priority.${priority}`),
    [t],
  );

  const taskStatusLabel = useCallback(
    (status: TaskStatus) => t(`badges.taskStatus.${status}`),
    [t],
  );

  const memberRoleLabel = useCallback(
    (role: string) => {
      const key = MEMBER_ROLE_LABEL_TO_KEY[role];
      if (key) return t(key);
      const numeric = Number(role);
      if (!Number.isNaN(numeric) && MEMBER_ROLE_KEYS[numeric]) {
        return t(MEMBER_ROLE_KEYS[numeric]);
      }
      return role;
    },
    [t],
  );

  const mapRoleOptions = useCallback(
    (roles: typeof PROJECT_MEMBER_ROLES) =>
      roles.map((role) => ({
        id: role.id,
        label: t(MEMBER_ROLE_KEYS[role.id] ?? "badges.memberRoles.member"),
        apiLabel: role.label,
      })),
    [t],
  );

  const memberRoleOptions = useMemo(
    () => mapRoleOptions(PROJECT_MEMBER_ROLES),
    [mapRoleOptions],
  );

  const inviteMemberRoleOptions = useMemo(
    () =>
      mapRoleOptions(
        PROJECT_MEMBER_ROLES.filter((role) =>
          PROJECT_INVITE_MEMBER_ROLE_IDS.includes(
            role.id as (typeof PROJECT_INVITE_MEMBER_ROLE_IDS)[number],
          ),
        ),
      ),
    [mapRoleOptions],
  );

  return {
    projectStatusLabel,
    invitationStatusLabel,
    priorityLabel,
    taskStatusLabel,
    memberRoleLabel,
    memberRoleOptions,
    inviteMemberRoleOptions,
  };
}
