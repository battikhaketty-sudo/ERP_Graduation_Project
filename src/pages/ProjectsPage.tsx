import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBanner } from "../components/ui/StatusBanner";
import { AddProjectModal } from "../components/projects/AddProjectModal";
import { AddSectionModal } from "../components/projects/AddSectionModal";
import { AddTaskModal } from "../components/projects/AddTaskModal";
import { InviteMemberModal } from "../components/projects/InviteMemberModal";
import { InvitationsTable, INVITATIONS_PAGE_SIZE } from "../components/projects/InvitationsTable";
import { ProjectDetailView } from "../components/projects/ProjectDetailView";
import { ProjectStatsCards } from "../components/projects/ProjectStatsCards";
import { ProjectsPageHeader, ProjectsViewTabs } from "../components/projects/ProjectsPageHeader";
import { ProjectsTable, PROJECTS_PAGE_SIZE } from "../components/projects/ProjectsTable";
import {
  addInvitation,
  addProject,
  addSection,
  addTask,
  deleteProject,
  deleteTask,
  getAllInvitations,
  getAllProjects,
  getProjectById,
  getProjectStats,
  getTaskStats,
  updateInvitationStatus,
  updateProject,
} from "../services/projects";
import type { Project, ProjectInvitation, ProjectTask } from "../types/project";

type ViewMode = "list" | "detail";
type ActiveTab = "projects" | "invitations";

export function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<ActiveTab>("projects");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectsPage, setProjectsPage] = useState(1);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(getAllProjects());
    setInvitations(getAllInvitations());
  }, []);

  const refreshData = useCallback(() => {
    setProjects(getAllProjects());
    setInvitations(getAllInvitations());
    setSelectedProject((current) => (current ? getProjectById(current.id) : null));
  }, []);

  const stats = useMemo(() => getProjectStats(), [projects, invitations]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.managerName.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query),
    );
  }, [projects, search]);

  const filteredInvitations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invitations;
    return invitations.filter(
      (invitation) =>
        invitation.projectName.toLowerCase().includes(query) ||
        invitation.employeeName.toLowerCase().includes(query),
    );
  }, [invitations, search]);

  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * PROJECTS_PAGE_SIZE;
    return filteredProjects.slice(start, start + PROJECTS_PAGE_SIZE);
  }, [filteredProjects, projectsPage]);

  const paginatedInvitations = useMemo(() => {
    const start = (invitationsPage - 1) * INVITATIONS_PAGE_SIZE;
    return filteredInvitations.slice(start, start + INVITATIONS_PAGE_SIZE);
  }, [filteredInvitations, invitationsPage]);

  const projectsTotalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PAGE_SIZE));
  const invitationsTotalPages = Math.max(
    1,
    Math.ceil(filteredInvitations.length / INVITATIONS_PAGE_SIZE),
  );

  const openProjectDetail = (project: Project) => {
    setSelectedProject(getProjectById(project.id));
    setViewMode("detail");
  };

  const handleDeleteProject = (project: Project) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${project.name}؟`)) return;
    deleteProject(project.id);
    setError(null);
    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
      setViewMode("list");
    }
    refreshData();
  };

  if (viewMode === "detail" && selectedProject) {
    return (
      <>
        <ProjectDetailView
          project={selectedProject}
          taskStats={getTaskStats(selectedProject.id)}
          onBack={() => {
            setViewMode("list");
            refreshData();
          }}
          onEdit={() => {
            setEditingProject(selectedProject);
            setIsProjectModalOpen(true);
          }}
          onDelete={() => handleDeleteProject(selectedProject)}
          onAddTask={() => setIsTaskModalOpen(true)}
          onAddSection={() => setIsSectionModalOpen(true)}
          onDeleteTask={(task: ProjectTask) => {
            deleteTask(selectedProject.id, task.id);
            refreshData();
          }}
        />

        <AddProjectModal
          isOpen={isProjectModalOpen}
          project={editingProject}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={async (payload) => {
            if (!editingProject) return;
            updateProject(editingProject.id, payload);
            refreshData();
          }}
        />

        <AddSectionModal
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          onSubmit={async (payload) => {
            addSection(selectedProject.id, payload);
            refreshData();
          }}
        />

        <AddTaskModal
          isOpen={isTaskModalOpen}
          project={selectedProject}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={async (payload) => {
            addTask(selectedProject.id, payload);
            refreshData();
          }}
        />
      </>
    );
  }

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && <StatusBanner variant="error" message={error} className="mb-4" />}

        <ProjectsPageHeader
          totalCount={projects.length}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setProjectsPage(1);
            setInvitationsPage(1);
          }}
          onAddClick={() => {
            if (activeTab === "projects") {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            } else {
              setIsInviteModalOpen(true);
            }
          }}
          addLabel={activeTab === "projects" ? "إضافة مشروع جديد" : "دعوة عضو جديد"}
          searchPlaceholder={
            activeTab === "projects"
              ? "ابحث عن اسم مشروع محدد"
              : "ابحث عن دعوة محددة"
          }
        />

        <ProjectStatsCards stats={stats} />
        <ProjectsViewTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "projects" ? (
          <ProjectsTable
            projects={paginatedProjects}
            currentPage={projectsPage}
            totalPages={projectsTotalPages}
            onPageChange={setProjectsPage}
            onProjectClick={openProjectDetail}
            onEdit={(project) => {
              setEditingProject(project);
              setIsProjectModalOpen(true);
            }}
            onDelete={handleDeleteProject}
          />
        ) : (
          <InvitationsTable
            invitations={paginatedInvitations}
            currentPage={invitationsPage}
            totalPages={invitationsTotalPages}
            onPageChange={setInvitationsPage}
            onAccept={(invitation) => {
              updateInvitationStatus(invitation.id, "accepted");
              refreshData();
            }}
            onReject={(invitation) => {
              updateInvitationStatus(invitation.id, "rejected");
              refreshData();
            }}
          />
        )}
      </main>

      <AddProjectModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={async (payload) => {
          if (editingProject) {
            updateProject(editingProject.id, payload);
          } else {
            addProject(payload);
          }
          refreshData();
        }}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        projects={projects}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={async (payload) => {
          addInvitation(payload);
          refreshData();
        }}
      />
    </>
  );
}
