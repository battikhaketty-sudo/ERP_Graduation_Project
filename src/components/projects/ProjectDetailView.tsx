import { useCallback, useEffect, useMemo, useState } from "react";
import { DetailBackButton } from "../ui/DetailBackButton";
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

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "general", label: "معلومات عامة" },
    { key: "members", label: "الأعضاء" },
    { key: "kanban", label: "لوحة كانبان" },
  ];

  if (selectedSection) {
    return (
      <SectionDetailView
        project={project}
        section={selectedSection}
        onBack={() => setSelectedSection(null)}
        onEditSection={() => onEditSection(selectedSection)}
        onDeleteSection={() => {
          onDeleteSection(selectedSection);
          setSelectedSection(null);
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
            label="العودة إلى قائمة المشاريع"
            onClick={onBack}
            className="mb-0"
          />
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-white/80">{project.description || "تفاصيل المشروع"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-hr-primary"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-red-500"
          >
            حذف
          </button>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl bg-[#EEF2F6] shadow-card">
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
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="الرقم" value={String(project.number)} />
            <InfoItem label="الاسم" value={project.name} />
            <InfoItem label="الوصف" value={project.description || "—"} />
            <InfoItem label="رقم المدير" value={project.managerId || "—"} />
            <InfoItem label="اسم المدير" value={project.managerName} />
            <div>
              <p className="mb-1 text-xs text-hr-muted">الحالة</p>
              <ProjectStatusBadge status={project.status} />
            </div>
            <InfoItem label="تاريخ البداية" value={project.startDate || "—"} />
            <InfoItem label="تاريخ النهاية" value={project.endDate || "—"} />
            <InfoItem label="تاريخ الإضافة" value={project.createdAt || "—"} />
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
          onSectionClick={setSelectedSection}
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hr-border bg-[#FAFCFE] px-4 py-3">
      <p className="mb-1 text-xs text-hr-muted">{label}</p>
      <p className="text-sm font-medium text-hr-text">{value}</p>
    </div>
  );
}
