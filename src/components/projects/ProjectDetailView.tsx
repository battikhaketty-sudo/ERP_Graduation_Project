import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { useUrlQueryNavigation } from "../../hooks/useUrlQueryNavigation";
import { DetailBackButton } from "../ui/DetailBackButton";
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
  onDeleteTask: (task: ProjectTask) => void;
  onInviteMember: () => void;
  onEditMember: (member: ProjectMember, role: string) => Promise<void>;
  onDeleteMember: (member: ProjectMember) => void;
};

type DetailTab = "general" | "members" | "kanban";

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
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);

  const detailStats: ProjectDetailStats = useMemo(
    () => buildProjectDetailStats(project, taskStats),
    [project, taskStats],
  );

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const result = await getProjectMembers(project.id, {
        page: membersPage,
        limit: MEMBERS_PAGE_SIZE,
      });
      setMembers(result.records);
      setMembersTotalPages(result.meta.totalPages || 1);
    } catch {
      setMembers([]);
      setMembersTotalPages(1);
    } finally {
      setMembersLoading(false);
    }
  }, [membersPage, project.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!sectionId) {
      setSelectedSection(null);
      return;
    }

    setSelectedSection(
      project.sections.find((section) => section.id === sectionId) ?? null,
    );
  }, [project.sections, sectionId]);

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "general", label: t("projects.detail.tabs.general") },
    { key: "members", label: t("projects.detail.tabs.members") },
    { key: "kanban", label: t("projects.detail.tabs.kanban") },
  ];

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
        onDeleteTask={onDeleteTask}
      />
    );
  }

  const showMembersTable = activeTab === "general" || activeTab === "members";
  const showKanban = activeTab === "general" || activeTab === "members" || activeTab === "kanban";

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <DetailBackButton
            variant="onPrimary"
            label={t("projects.detail.backLabel")}
            onClick={onBack}
            className="mb-0"
          />
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-white/80">
              {project.description || t("projects.detail.defaultDescription")}
            </p>
          </div>
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

      {(activeTab === "general" || activeTab === "members") && (
        <ProjectDetailStatsCards stats={detailStats} />
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
        onSubmit={onEditMember}
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
