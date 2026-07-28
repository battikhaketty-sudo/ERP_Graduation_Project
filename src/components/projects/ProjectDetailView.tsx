import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { useUrlQueryNavigation } from "../../hooks/useUrlQueryNavigation";
import { DetailBackButton } from "../ui/DetailBackButton";
import { StatusBanner } from "../ui/StatusBanner";
import { cardSurfaceClass, subtlePanelClass } from "../ui/formStyles";
import { buildProjectDetailStats } from "../../services/projects/project.mapper";
import { getProjectMembers } from "../../services/projects";
import type {
  Project,
  ProjectDetailStats,
  ProjectMember,
  ProjectSection,
  ProjectTask,
  TaskStats,
} from "../../types/project";
import { EditMemberModal } from "./EditMemberModal";
import { ProjectKanbanBoard } from "./ProjectKanbanBoard";
import {
  MEMBERS_PAGE_SIZE,
  ProjectMembersTable,
} from "./ProjectMembersTable";
import { ProjectStatusBadge } from "./ProjectBadges";
import { ProjectDetailStatsCards } from "./ProjectStatsCards";
import { ProjectFlowPanel } from "./ProjectFlowPanel";
import { ProjectPerformancePanel } from "./ProjectPerformancePanel";
import { ProjectSectionFlowPanel } from "./ProjectSectionFlowPanel";
import { ProjectTasksChartPanel } from "./ProjectTasksChartPanel";
import { SectionDetailView } from "./SectionDetailView";

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
};

type DetailTab =
  | "general"
  | "members"
  | "flow"
  | "sectionFlow"
  | "performance"
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
  onMoveSection,
  onEditTask,
  onDeleteTask,
  onInviteMember,
  onEditMember,
  onDeleteMember,
}: ProjectDetailViewProps) {
  const { t } = useTranslation();
  const {
    value: sectionId,
    pushValue: openSectionInUrl,
    removeValue: clearSectionFromUrl,
    goBack: goBackFromSection,
  } = useUrlQueryNavigation({ param: "section" });
  const [activeTab, setActiveTab] = useState<DetailTab>("general");
  const [selectedSection, setSelectedSection] = useState<ProjectSection | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [membersReloadKey, setMembersReloadKey] = useState(0);

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
    if (!sectionId) {
      setSelectedSection(null);
      return;
    }

    const match =
      project.sections.find((section) => section.id === sectionId) ?? null;
    setSelectedSection(match);
    if (!match) {
      clearSectionFromUrl();
    }
  }, [clearSectionFromUrl, project.sections, sectionId]);

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "general", label: t("projects.detail.tabs.general") },
    { key: "members", label: t("projects.detail.tabs.members") },
    { key: "flow", label: t("projects.detail.tabs.flow") },
    { key: "sectionFlow", label: t("projects.detail.tabs.sectionFlow") },
    { key: "performance", label: t("projects.detail.tabs.performance") },
    { key: "kanban", label: t("projects.detail.tabs.kanban") },
  ];

  const performanceRevision = useMemo(
    () =>
      (project.tasks ?? [])
        .map((task) => `${task.id}:${task.status}:${task.priority}:${task.assigneeIds.join(",")}`)
        .join("|"),
    [project.tasks],
  );

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
      />
    );
  }

  const showMembersTable = activeTab === "general" || activeTab === "members";
  const showKanban = activeTab === "general" || activeTab === "members" || activeTab === "kanban";

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
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

      {(activeTab === "general" ||
        activeTab === "members" ||
        activeTab === "flow" ||
        activeTab === "sectionFlow" ||
        activeTab === "performance") && (
        <ProjectDetailStatsCards stats={detailStats} />
      )}

      {activeTab === "flow" && (
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
          />
        </>
      )}

      {activeTab === "sectionFlow" && (
        <ProjectSectionFlowPanel
          project={project}
          onAddSection={onAddSection}
          onEditSection={onEditSection}
          onDeleteSection={onDeleteSection}
        />
      )}

      {activeTab === "performance" && (
        <ProjectPerformancePanel
          project={project}
          revision={performanceRevision}
        />
      )}

      {activeTab === "general" && (
        <section className={`mb-5 ${cardSurfaceClass} p-5`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem
              label={t("projects.detail.fields.number")}
              value={project.id}
              dir="ltr"
            />
            <InfoItem label={t("projects.detail.fields.name")} value={project.name} />
            <InfoItem
              label={t("projects.detail.fields.description")}
              value={project.description || t("common.dash")}
            />
            <InfoItem
              label={t("projects.detail.fields.managerId")}
              value={project.managerId || t("common.dash")}
            />
            <InfoItem label={t("projects.detail.fields.managerName")} value={project.managerName} />
            <div>
              <p className="mb-1 text-xs text-hr-muted">{t("projects.table.columns.status")}</p>
              <ProjectStatusBadge status={project.status} />
            </div>
            <InfoItem
              label={t("projects.detail.fields.startDate")}
              value={project.startDate || t("common.dash")}
            />
            <InfoItem
              label={t("projects.detail.fields.endDate")}
              value={project.endDate || t("common.dash")}
            />
            <InfoItem
              label={t("projects.detail.fields.createdAt")}
              value={project.createdAt || t("common.dash")}
            />
          </div>
        </section>
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
          />
        </div>
      )}

      {showKanban && (
        <ProjectKanbanBoard
          project={project}
          onAddSection={onAddSection}
          onAddTask={() => onAddTask()}
          onSectionClick={(section) => openSectionInUrl(section.id)}
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
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className={subtlePanelClass}>
      <p className="mb-1 text-xs text-hr-muted">{label}</p>
      <p className="text-sm font-medium text-hr-text" dir={dir}>
        {value}
      </p>
    </div>
  );
}
