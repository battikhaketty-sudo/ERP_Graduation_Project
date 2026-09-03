import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { useUrlQueryNavigation } from "../../hooks/useUrlQueryNavigation";
import { DetailBackButton } from "../ui/DetailBackButton";
import { StatusBanner } from "../ui/StatusBanner";
import { cardSurfaceClass, subtlePanelClass } from "../ui/formStyles";
import { EntityLink } from "../ui/EntityLink";
import { employeePath } from "../../constants/entityPaths";
import { buildProjectDetailStats } from "../../services/projects/project.mapper";
import {
  getProjectInvitations,
  getProjectMembers,
  getSectionById,
  updateInvitationStatus,
} from "../../services/projects";
import type {
  Project,
  ProjectDetailStats,
  ProjectInvitation,
  ProjectMember,
  ProjectSection,
  ProjectTask,
  TaskStats,
} from "../../types/project";
import { EditMemberModal } from "./EditMemberModal";
import {
  InvitationsTable,
  INVITATIONS_PAGE_SIZE,
} from "./InvitationsTable";
import { ProjectKanbanBoard } from "./ProjectKanbanBoard";
import {
  MEMBERS_PAGE_SIZE,
  ProjectMembersTable,
} from "./ProjectMembersTable";
import { ProjectStatusBadge } from "./ProjectBadges";
import { ProjectDetailStatsCards } from "./ProjectStatsCards";
import { ProjectFlowPanel } from "./ProjectFlowPanel";
import { ProjectTasksChartPanel } from "./ProjectTasksChartPanel";
import { SectionDetailView } from "./SectionDetailView";
import { TaskDetailView } from "./TaskDetailView";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { useToast } from "../../context/ToastContext";

type ProjectDetailViewProps = {
  project: Project;
  taskStats: TaskStats;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: (sectionId?: string) => void;
  onAddSection: () => void;
  onEditSection: (section: ProjectSection) => void;
  onDeleteSection: (section: ProjectSection) => void;
  onMoveSection: (sectionId: string, direction: "earlier" | "later") => void;
  onEditTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onInviteMember: () => void;
  onEditMember: (member: ProjectMember, role: string) => Promise<void>;
  onDeleteMember: (member: ProjectMember) => void;
  onLeaveProject: () => void;
  /** Bump after sending an invite so the invitations tab reloads. */
  invitationsReloadKey?: number;
  onRefresh?: () => Promise<void> | void;
};

type DetailTab =
  | "general"
  | "members"
  | "invitations"
  | "flow"
  | "kanban";

export function ProjectDetailView({
  project,
  taskStats,
  onBack,
  onEdit,
  onDelete,
  onAddTask,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onEditTask,
  onDeleteTask,
  onInviteMember,
  onEditMember,
  onDeleteMember,
  onLeaveProject,
  invitationsReloadKey = 0,
  onRefresh,
}: ProjectDetailViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    value: sectionId,
    pushValue: openSectionInUrl,
    removeValue: clearSectionFromUrl,
    goBack: goBackFromSection,
  } = useUrlQueryNavigation({ param: "section" });
  const {
    value: taskId,
    pushValue: openTaskInUrl,
    goBack: goBackFromTask,
  } = useUrlQueryNavigation({ param: "task" });
  const [activeTab, setActiveTab] = useState<DetailTab>("kanban");
  const [selectedSection, setSelectedSection] = useState<ProjectSection | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [membersReloadKey, setMembersReloadKey] = useState(0);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [invitationsLocalReload, setInvitationsLocalReload] = useState(0);

  const detailStats: ProjectDetailStats = useMemo(
    () => buildProjectDetailStats(project, taskStats),
    [project, taskStats],
  );

  const reloadMembers = useCallback(() => {
    setMembersReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const result = await getProjectMembers(project.id, {
          page: membersPage,
          limit: MEMBERS_PAGE_SIZE,
        });
        if (cancelled) return;
        setMembers(result.records);
        setMembersTotalPages(result.meta.totalPages || 1);
      } catch {
        if (cancelled) return;
        setMembers([]);
        setMembersTotalPages(1);
        setMembersError(t("projects.page.loadDetailError"));
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [membersPage, membersReloadKey, project.id, t]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setInvitationsLoading(true);
      setInvitationsError(null);
      try {
        const records = await getProjectInvitations(project.id, { limit: 100 });
        if (cancelled) return;
        setInvitations(records);
        setInvitationsPage(1);
      } catch (err) {
        if (cancelled) return;
        setInvitations([]);
        setInvitationsError(
          getThrownErrorMessage(err, t("projects.page.loadDetailError")),
        );
      } finally {
        if (!cancelled) setInvitationsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [invitationsLocalReload, invitationsReloadKey, project.id, t]);

  useEffect(() => {
    if (!sectionId) {
      setSelectedSection(null);
      return;
    }

    const match =
      project.sections.find((section) => section.id === sectionId) ?? null;
    setSelectedSection(match);
    if (!match) {
      clearSectionFromUrl();
      return;
    }

    let cancelled = false;
    void getSectionById(project.id, sectionId)
      .then((fresh) => {
        if (cancelled || !fresh) return;
        setSelectedSection({
          ...match,
          ...fresh,
          dependsOnSectionIds:
            fresh.dependsOnSectionIds.length > 0
              ? fresh.dependsOnSectionIds
              : match.dependsOnSectionIds,
        });
      })
      .catch(() => {
        // Keep the list payload if GET by id is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [clearSectionFromUrl, project.id, project.sections, sectionId]);

  const invitationsTotalPages = Math.max(
    1,
    Math.ceil(invitations.length / INVITATIONS_PAGE_SIZE),
  );
  const paginatedInvitations = useMemo(() => {
    const start = (invitationsPage - 1) * INVITATIONS_PAGE_SIZE;
    return invitations.slice(start, start + INVITATIONS_PAGE_SIZE);
  }, [invitations, invitationsPage]);

  const handleInvitationAction = async (
    invitation: ProjectInvitation,
    status: "accepted" | "rejected" | "cancelled",
  ) => {
    try {
      await updateInvitationStatus(invitation, status);
      setInvitationsLocalReload((key) => key + 1);
      if (status === "accepted") {
        showToast(t("projects.toasts.inviteAccepted"), "success");
      } else if (status === "rejected") {
        showToast(t("projects.toasts.inviteRejected"), "success");
      } else {
        showToast(t("projects.toasts.inviteCancelled"), "success");
      }
    } catch (err) {
      const message = getThrownErrorMessage(err, t("projects.page.loadError"));
      setInvitationsError(message);
      showToast(message, "error");
    }
  };

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "kanban", label: t("projects.detail.tabs.kanban") },
    { key: "general", label: t("projects.detail.tabs.general") },
    { key: "members", label: t("projects.detail.tabs.members") },
    { key: "invitations", label: t("projects.detail.tabs.invitations") },
    { key: "flow", label: t("projects.detail.tabs.flow") },
  ];

  if (taskId) {
    return (
      <TaskDetailView
        project={project}
        taskId={taskId}
        onBack={goBackFromTask}
        onOpenTask={(nextTaskId) => openTaskInUrl(nextTaskId)}
        onEdit={(task) => {
          onEditTask(task);
        }}
        onDelete={(task) => {
          onDeleteTask(task);
        }}
      />
    );
  }

  if (selectedSection) {
    return (
      <SectionDetailView
        project={project}
        section={selectedSection}
        onBack={goBackFromSection}
        onEditSection={() => onEditSection(selectedSection)}
        onDeleteSection={() => {
          onDeleteSection(selectedSection);
          clearSectionFromUrl();
        }}
        onAddTask={() => onAddTask(selectedSection.id)}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onTaskClick={(task) => openTaskInUrl(task.id)}
      />
    );
  }

  const showMembersTable = activeTab === "members";
  const showInvitations = activeTab === "invitations";
  const showKanban = activeTab === "kanban";
  const showGeneral = activeTab === "general";
  const showFlow = activeTab === "flow";

  return (
    <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <DetailBackButton
        label={t("projects.detail.backLabel")}
        onClick={onBack}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-white/80">
            {project.description || t("projects.detail.defaultDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-hr-primary"
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={onLeaveProject}
            className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-orange-600"
          >
            {t("projects.detail.leaveProject")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-red-500"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <div className={`mb-5 overflow-hidden ${cardSurfaceClass} bg-hr-table-alt shadow-none`}>
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "relative px-6 py-3.5 text-sm font-bold transition",
                activeTab === tab.key ? "text-hr-primary" : "text-hr-muted hover:text-hr-text",
              ].join(" ")}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-hr-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {(showGeneral ||
        showMembersTable ||
        showInvitations ||
        showFlow) && (
        <ProjectDetailStatsCards stats={detailStats} />
      )}

      {showFlow && (
        <>
          <ProjectFlowPanel
            project={project}
            taskStats={taskStats}
            onAddTask={(sectionId) => onAddTask(sectionId)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
          <ProjectTasksChartPanel
            project={project}
            onAddTask={(sectionId) => onAddTask(sectionId)}
            onTaskClick={(task) => openTaskInUrl(task.id)}
          />
        </>
      )}

      {showGeneral && (
        <>
          <section className={`mb-5 ${cardSurfaceClass} p-5`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label={t("projects.detail.fields.name")} value={project.name} />
              <div className={subtlePanelClass}>
                <p className="mb-1 text-xs text-hr-muted">{t("projects.table.columns.status")}</p>
                <ProjectStatusBadge status={project.status} />
              </div>
              <InfoItem
                label={t("projects.detail.fields.managerName")}
                value={project.managerName || t("common.dash")}
                to={employeePath(project.managerId)}
              />
              <InfoItem
                label={t("projects.detail.fields.endDate")}
                value={project.endDate || t("common.dash")}
              />
              <InfoItem
                label={t("projects.detail.fields.startDate")}
                value={project.startDate || t("common.dash")}
              />
              <InfoItem
                label={t("projects.detail.fields.description")}
                value={project.description || t("common.dash")}
              />
            </div>
          </section>
          <div className="mb-5">
            {membersError && (
              <StatusBanner variant="error" message={membersError} className="mb-3" />
            )}
            <ProjectMembersTable
              members={members}
              currentPage={membersPage}
              totalPages={membersTotalPages}
              loading={membersLoading}
              onPageChange={setMembersPage}
              onEdit={setEditingMember}
              onDelete={onDeleteMember}
              showAddButton
              onAddClick={onInviteMember}
              onLeaveProject={onLeaveProject}
            />
          </div>
          <div className="mb-5">
            <ProjectKanbanBoard
              project={project}
              onAddSection={onAddSection}
              onAddTask={() => onAddTask()}
              onSectionClick={(section) => openSectionInUrl(section.id)}
              onTaskClick={(task) => openTaskInUrl(task.id)}
            />
          </div>
        </>
      )}

      {showMembersTable && (
        <div className="mb-5">
          {membersError && (
            <StatusBanner variant="error" message={membersError} className="mb-3" />
          )}
          <ProjectMembersTable
            members={members}
            currentPage={membersPage}
            totalPages={membersTotalPages}
            loading={membersLoading}
            onPageChange={setMembersPage}
            onEdit={setEditingMember}
            onDelete={onDeleteMember}
            showAddButton
            onAddClick={onInviteMember}
            onLeaveProject={onLeaveProject}
          />
        </div>
      )}

      {showInvitations && (
        <div className="mb-5">
          {invitationsError && (
            <StatusBanner
              variant="error"
              message={invitationsError}
              className="mb-3"
            />
          )}
          {invitationsLoading ? (
            <section className={cardSurfaceClass}>
              <p className="px-5 py-10 text-center text-sm text-hr-muted">
                {t("common.loading")}
              </p>
            </section>
          ) : (
            <InvitationsTable
              invitations={paginatedInvitations}
              currentPage={invitationsPage}
              totalPages={invitationsTotalPages}
              onPageChange={setInvitationsPage}
              onAccept={(invitation) =>
                void handleInvitationAction(invitation, "accepted")
              }
              onReject={(invitation) =>
                void handleInvitationAction(invitation, "rejected")
              }
              onCancel={(invitation) =>
                void handleInvitationAction(invitation, "cancelled")
              }
              projectScoped
              actionsMode="manage"
              title={t("projects.invitations.manageTitle")}
              emptyMessage={t("projects.invitations.empty")}
              showInviteButton
              onInviteClick={onInviteMember}
            />
          )}
        </div>
      )}

      {showKanban && (
        <ProjectKanbanBoard
          project={project}
          onAddSection={onAddSection}
          onAddTask={() => onAddTask()}
          onSectionClick={(section) => openSectionInUrl(section.id)}
          onTaskClick={(task) => openTaskInUrl(task.id)}
        />
      )}

      <EditMemberModal
        isOpen={Boolean(editingMember)}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSubmit={async (member, role) => {
          await onEditMember(member, role);
          reloadMembers();
        }}
      />
    </main>
  );
}

function InfoItem({
  label,
  value,
  dir,
  to,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  to?: string;
}) {
  return (
    <div className={subtlePanelClass}>
      <p className="mb-1 text-xs text-hr-muted">{label}</p>
      {to ? (
        <EntityLink to={to} className="text-sm" title={value}>
          {value}
        </EntityLink>
      ) : (
        <p className="text-sm font-medium text-hr-text" dir={dir}>
          {value}
        </p>
      )}
    </div>
  );
}
