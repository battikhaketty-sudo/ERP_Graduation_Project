import { useCallback, useEffect, useMemo, useState } from "react";

import { StatusBanner } from "../components/ui/StatusBanner";
import { useConfirmDialog } from "../context/ConfirmDialogContext";

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

  deleteMember,

  deleteProject,

  deleteSection,

  deleteTask,

  getAllInvitations,

  getProjectById,

  getProjectStats,

  getProjects,

  getTaskStats,

  updateInvitationStatus,

  updateMember,

  updateProject,

  updateSection,

} from "../services/projects";

import type { Project, ProjectInvitation, ProjectMember, ProjectSection, ProjectStats, ProjectTask, TaskStats } from "../types/project";

import { getThrownErrorMessage } from "../utils/apiResponse";



type ViewMode = "list" | "detail";

type ActiveTab = "projects" | "invitations";



const emptyStats: ProjectStats = {

  projectsCount: 0,

  tasksCount: 0,

  sectionsCount: 0,

  assignedEmployeesCount: 0,

};



export function ProjectsPage() {
  const { confirm } = useConfirmDialog();

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [activeTab, setActiveTab] = useState<ActiveTab>("projects");

  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);

  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [taskStats, setTaskStats] = useState<TaskStats>({

    total: 0,

    inProgress: 0,

    completed: 0,

    late: 0,

  });

  const [stats, setStats] = useState<ProjectStats>(emptyStats);

  const [projectsPage, setProjectsPage] = useState(1);

  const [projectsTotalPages, setProjectsTotalPages] = useState(1);

  const [invitationsPage, setInvitationsPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [editingSection, setEditingSection] = useState<ProjectSection | null>(null);

  const [defaultTaskSectionId, setDefaultTaskSectionId] = useState<string | undefined>();



  const loadListData = useCallback(async () => {

    try {

      setLoading(true);

      setError(null);



      const [projectsResult, invitationsResult, statsResult] = await Promise.all([

        getProjects({

          page: projectsPage,

          limit: PROJECTS_PAGE_SIZE,

          name: search.trim() || undefined,

        }),

        getAllInvitations({

          employeeName: search.trim() || undefined,

          projectName: search.trim() || undefined,

        }),

        getProjectStats(),

      ]);



      setProjects(projectsResult.records);

      setProjectsTotalPages(projectsResult.meta.totalPages || 1);

      setInvitations(invitationsResult);

      setStats(statsResult);

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل تحميل بيانات المشاريع"));

    } finally {

      setLoading(false);

    }

  }, [projectsPage, search]);



  useEffect(() => {

    if (viewMode !== "list") return;

    const timer = window.setTimeout(() => {

      void loadListData();

    }, search ? 300 : 0);

    return () => window.clearTimeout(timer);

  }, [viewMode, loadListData, search]);



  const paginatedInvitations = useMemo(() => {

    const start = (invitationsPage - 1) * INVITATIONS_PAGE_SIZE;

    return invitations.slice(start, start + INVITATIONS_PAGE_SIZE);

  }, [invitations, invitationsPage]);



  const invitationsTotalPages = Math.max(

    1,

    Math.ceil(invitations.length / INVITATIONS_PAGE_SIZE),

  );



  const openProjectDetail = async (project: Project) => {

    try {

      setError(null);

      const detail = await getProjectById(project.id);

      const detailStats = await getTaskStats(project.id);

      setSelectedProject(detail);

      setTaskStats(detailStats);

      setViewMode("detail");

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل تحميل تفاصيل المشروع"));

    }

  };



  const refreshSelectedProject = async (projectId: string) => {

    const detail = await getProjectById(projectId);

    const detailStats = await getTaskStats(projectId);

    setSelectedProject(detail);

    setTaskStats(detailStats);

    return detail;

  };



  const handleDeleteProject = async (project: Project) => {
    const confirmed = await confirm({
      message: `هل أنت متأكد من حذف ${project.name}؟`,
    });
    if (!confirmed) return;



    try {

      await deleteProject(project.id);

      setError(null);

      if (selectedProject?.id === project.id) {

        setSelectedProject(null);

        setViewMode("list");

      }

      await loadListData();

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل حذف المشروع"));

    }

  };



  const handleDeleteMember = async (member: ProjectMember) => {
    if (!selectedProject) return;

    const confirmed = await confirm({
      title: "تأكيد الإزالة",
      message: `هل أنت متأكد من إزالة ${member.employeeName} من المشروع؟`,
      confirmLabel: "إزالة",
    });
    if (!confirmed) return;



    try {

      await deleteMember(selectedProject.id, member.id);

      await refreshSelectedProject(selectedProject.id);

      setError(null);

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل حذف العضو"));

    }

  };



  const handleDeleteSection = async (section: ProjectSection) => {

    if (!selectedProject) return;

    const confirmed = await confirm({
      message: `هل أنت متأكد من حذف قسم "${section.name}"؟`,
    });
    if (!confirmed) return;



    try {

      await deleteSection(selectedProject.id, section.id);

      await refreshSelectedProject(selectedProject.id);

      setError(null);

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل حذف القسم"));

    }

  };



  const handleDeleteTask = async (task: ProjectTask) => {

    if (!selectedProject) return;

    const confirmed = await confirm({
      message: `هل أنت متأكد من حذف المهمة "${task.title}"؟`,
    });
    if (!confirmed) return;



    try {

      await deleteTask(selectedProject.id, task.id);

      await refreshSelectedProject(selectedProject.id);

      setError(null);

    } catch (err) {

      setError(getThrownErrorMessage(err, "فشل حذف المهمة"));

    }

  };



  const taskModalProject = useMemo(() => {

    if (!selectedProject) return null;

    if (!defaultTaskSectionId) return selectedProject;

    return selectedProject;

  }, [defaultTaskSectionId, selectedProject]);



  if (viewMode === "detail" && selectedProject) {

    return (

      <>

        {error && <StatusBanner variant="error" message={error} className="mx-6 mt-4" />}



        <ProjectDetailView

          project={selectedProject}

          taskStats={taskStats}

          onBack={() => {

            setViewMode("list");

            void loadListData();

          }}

          onEdit={() => {

            setEditingProject(selectedProject);

            setIsProjectModalOpen(true);

          }}

          onDelete={() => void handleDeleteProject(selectedProject)}

          onAddTask={(sectionId) => {

            setDefaultTaskSectionId(sectionId);

            setIsTaskModalOpen(true);

          }}

          onAddSection={() => {

            setEditingSection(null);

            setIsSectionModalOpen(true);

          }}

          onEditSection={(section) => {

            setEditingSection(section);

            setIsSectionModalOpen(true);

          }}

          onDeleteSection={(section) => void handleDeleteSection(section)}

          onDeleteTask={(task) => void handleDeleteTask(task)}

          onInviteMember={() => setIsInviteModalOpen(true)}

          onEditMember={async (member, role) => {

            await updateMember(selectedProject.id, member.id, { role });

            await refreshSelectedProject(selectedProject.id);

          }}

          onDeleteMember={(member) => void handleDeleteMember(member)}

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

            await updateProject(editingProject.id, payload);

            await refreshSelectedProject(editingProject.id);

            await loadListData();

          }}

        />



        <AddSectionModal

          isOpen={isSectionModalOpen}

          section={editingSection}

          onClose={() => {

            setIsSectionModalOpen(false);

            setEditingSection(null);

          }}

          onSubmit={async (payload) => {

            if (editingSection) {

              await updateSection(selectedProject.id, editingSection.id, payload);

            } else {

              await addSection(selectedProject.id, payload);

            }

            await refreshSelectedProject(selectedProject.id);

            await loadListData();

          }}

        />



        {taskModalProject && (

          <AddTaskModal

            isOpen={isTaskModalOpen}

            project={taskModalProject}

            defaultSectionId={defaultTaskSectionId}

            onClose={() => {

              setIsTaskModalOpen(false);

              setDefaultTaskSectionId(undefined);

            }}

            onSubmit={async (payload) => {

              await addTask(selectedProject.id, payload);

              await refreshSelectedProject(selectedProject.id);

            }}

          />

        )}



        <InviteMemberModal

          isOpen={isInviteModalOpen}

          projects={[selectedProject]}

          defaultProjectId={selectedProject.id}

          onClose={() => setIsInviteModalOpen(false)}

          onSubmit={async (payload) => {

            await addInvitation(payload);

            await refreshSelectedProject(selectedProject.id);

            await loadListData();

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

          totalCount={stats.projectsCount || projects.length}

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



        {loading ? (

          <div className="rounded-2xl bg-white p-10 text-center text-sm text-hr-muted shadow-card">

            جاري التحميل…

          </div>

        ) : activeTab === "projects" ? (

          <ProjectsTable

            projects={projects}

            currentPage={projectsPage}

            totalPages={projectsTotalPages}

            onPageChange={setProjectsPage}

            onProjectClick={(project) => void openProjectDetail(project)}

            onEdit={(project) => {

              setEditingProject(project);

              setIsProjectModalOpen(true);

            }}

            onDelete={(project) => void handleDeleteProject(project)}

          />

        ) : (

          <InvitationsTable

            invitations={paginatedInvitations}

            currentPage={invitationsPage}

            totalPages={invitationsTotalPages}

            onPageChange={setInvitationsPage}

            onAccept={async (invitation) => {

              try {

                await updateInvitationStatus(invitation, "accepted");

                await loadListData();

              } catch (err) {

                setError(getThrownErrorMessage(err, "فشل قبول الدعوة"));

              }

            }}

            onReject={async (invitation) => {

              try {

                await updateInvitationStatus(invitation, "rejected");

                await loadListData();

              } catch (err) {

                setError(getThrownErrorMessage(err, "فشل رفض الدعوة"));

              }

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

            await updateProject(editingProject.id, payload);

          } else {

            await addProject(payload);

            setProjectsPage(1);

          }

          await loadListData();

        }}

      />



      <InviteMemberModal

        isOpen={isInviteModalOpen}

        projects={projects}

        onClose={() => setIsInviteModalOpen(false)}

        onSubmit={async (payload) => {

          await addInvitation(payload);

          await loadListData();

        }}

      />

    </>

  );

}

