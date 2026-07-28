import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUrlQueryNavigation } from "../hooks/useUrlQueryNavigation";

import { StatusBanner } from "../components/ui/StatusBanner";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useTranslation } from "../i18n";

import { AddProjectModal } from "../components/projects/AddProjectModal";
import { AddSectionModal } from "../components/projects/AddSectionModal";
import { AddTaskModal } from "../components/projects/AddTaskModal";
import { InviteMemberModal } from "../components/projects/InviteMemberModal";
import {
  InvitationsTable,
  INVITATIONS_PAGE_SIZE,
} from "../components/projects/InvitationsTable";
import { ProjectDetailView } from "../components/projects/ProjectDetailView";
import { ProjectStatsCards } from "../components/projects/ProjectStatsCards";
import {
  ProjectsPageHeader,
  ProjectsViewTabs,
} from "../components/projects/ProjectsPageHeader";
import {
  ProjectsTable,
  PROJECTS_PAGE_SIZE,
} from "../components/projects/ProjectsTable";

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
  updateTask,
} from "../services/projects";

import type {
  Project,
  ProjectInvitation,
  ProjectMember,
  ProjectSection,
  ProjectStats,
  ProjectTask,
  TaskStats,
} from "../types/project";

import { getThrownErrorMessage } from "../utils/apiResponse";

type ActiveTab = "projects" | "invitations";

const emptyStats: ProjectStats = {
  projectsCount: 0,
  tasksCount: 0,
  sectionsCount: 0,
  assignedEmployeesCount: 0,
};

export function ProjectsPage() {
  const { confirm } = useConfirmDialog();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    value: projectId,
    pushValue: openProjectInUrl,
    removeValue: clearProjectFromUrl,
    goBack: goBackToProjectList,
  } = useUrlQueryNavigation({ param: "id" });

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
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingSection, setEditingSection] = useState<ProjectSection | null>(
    null,
  );
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [defaultTaskSectionId, setDefaultTaskSectionId] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;

    setActiveTab("projects");
    setEditingProject(null);
    setIsProjectModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadListData = useCallback(async () => {
    const query = search.trim().toLowerCase();

    try {
      setLoading(true);
      setError(null);

      // Fetch a wider set when searching so we can filter locally
      // (API Name filter is often exact / unreliable for partial match).
      const [projectsResult, invitationsResult, statsResult] =
        await Promise.all([
          getProjects({
            page: query ? 1 : projectsPage,
            limit: query ? 100 : PROJECTS_PAGE_SIZE,
          }),
          getAllInvitations(),
          getProjectStats(),
        ]);

      let projectRecords = projectsResult.records;
      if (query) {
        projectRecords = projectRecords.filter((project) =>
          [
            project.name,
            project.number,
            project.managerName,
            project.assignedEmployeeName,
            project.description,
          ].some((field) => field.toLowerCase().includes(query)),
        );
        const totalPages = Math.max(
          1,
          Math.ceil(projectRecords.length / PROJECTS_PAGE_SIZE),
        );
        const page = Math.min(projectsPage, totalPages);
        const start = (page - 1) * PROJECTS_PAGE_SIZE;
        setProjects(projectRecords.slice(start, start + PROJECTS_PAGE_SIZE));
        setProjectsTotalPages(totalPages);
      } else {
        setProjects(projectRecords);
        setProjectsTotalPages(projectsResult.meta.totalPages || 1);
      }

      const invitationRecords = query
        ? invitationsResult.filter((invitation) =>
            [
              invitation.projectName,
              invitation.projectNumber,
              invitation.employeeName,
            ].some((field) => field.toLowerCase().includes(query)),
          )
        : invitationsResult;

      setInvitations(invitationRecords);
      setStats(statsResult);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("projects.page.loadError")));
    } finally {
      setLoading(false);
    }
  }, [projectsPage, search, t]);

  useEffect(() => {
    if (projectId) return;

    const timer = window.setTimeout(
      () => {
        void loadListData();
      },
      search ? 300 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [projectId, loadListData, search]);

  useEffect(() => {
    if (!projectId) {
      setSelectedProject(null);
      setTaskStats({ total: 0, inProgress: 0, completed: 0, late: 0 });
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        setError(null);
        // Drop previous project immediately so its sections never flash/mix in.
        setSelectedProject(null);
        const detail = await getProjectById(projectId);
        const detailStats = await getTaskStats(projectId);
        if (!cancelled) {
          setSelectedProject(detail);
          setTaskStats(detailStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getThrownErrorMessage(err, t("projects.page.loadDetailError")));
          setSelectedProject(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [projectId, t]);

  const paginatedInvitations = useMemo(() => {
    const start = (invitationsPage - 1) * INVITATIONS_PAGE_SIZE;
    return invitations.slice(start, start + INVITATIONS_PAGE_SIZE);
  }, [invitations, invitationsPage]);

  const invitationsTotalPages = Math.max(
    1,
    Math.ceil(invitations.length / INVITATIONS_PAGE_SIZE),
  );

  const openProjectDetail = (project: Project) => {
    openProjectInUrl(project.id);
  };

  const refreshSelectedProject = async (targetProjectId: string) => {
    const detail = await getProjectById(targetProjectId);
    const detailStats = await getTaskStats(targetProjectId);
    // Ignore stale refreshes after the user navigated to another project.
    if (searchParams.get("id") !== targetProjectId) return detail;
    setSelectedProject(detail);
    setTaskStats(detailStats);
    return detail;
  };

  const handleDeleteProject = async (project: Project) => {
    const confirmed = await confirm({
      message: t("projects.page.deleteConfirm", { name: project.name }),
    });
    if (!confirmed) return;

    try {
      await deleteProject(project.id);
      setError(null);
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        clearProjectFromUrl();
      }
      await loadListData();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("projects.page.deleteError")));
    }
  };

  const handleDeleteMember = async (member: ProjectMember) => {
    if (!selectedProject) return;

    const confirmed = await confirm({
      title: t("projects.page.deleteMemberTitle"),
      message: t("projects.page.deleteMemberMessage", {
        name: member.employeeName,
      }),
      confirmLabel: t("projects.page.deleteMemberConfirm"),
    });
    if (!confirmed) return;

    try {
      await deleteMember(selectedProject.id, member.id);
      await refreshSelectedProject(selectedProject.id);
      setError(null);
    } catch (err) {
      setError(
        getThrownErrorMessage(err, t("projects.page.deleteMemberError")),
      );
    }
  };

  const handleDeleteSection = async (section: ProjectSection) => {
    if (!selectedProject) return;

    const confirmed = await confirm({
      message: t("projects.page.deleteSectionConfirm", { name: section.name }),
    });
    if (!confirmed) return;

    try {
      await deleteSection(selectedProject.id, section.id);
      await refreshSelectedProject(selectedProject.id);
      setError(null);
    } catch (err) {
      setError(
        getThrownErrorMessage(err, t("projects.page.deleteSectionError")),
      );
    }
  };

  const handleMoveSection = async (
    sectionId: string,
    direction: "earlier" | "later",
  ) => {
    if (!selectedProject) return;

    const ordered = [...selectedProject.sections].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    );
    const index = ordered.findIndex((section) => section.id === sectionId);
    if (index < 0) return;

    const swapIndex = direction === "earlier" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];

    try {
      await Promise.all(
        next.map((section, orderIndex) =>
          updateSection(selectedProject.id, section.id, {
            name: section.name,
            displayOrder: orderIndex + 1,
          }),
        ),
      );
      await refreshSelectedProject(selectedProject.id);
      setError(null);
    } catch (err) {
      setError(
        getThrownErrorMessage(err, t("projects.page.moveSectionError")),
      );
    }
  };

  const handleDeleteTask = async (task: ProjectTask) => {
    if (!selectedProject) return;

    const confirmed = await confirm({
      message: t("projects.page.deleteTaskConfirm", { name: task.title }),
    });
    if (!confirmed) return;

    try {
      await deleteTask(selectedProject.id, task.id);
      await refreshSelectedProject(selectedProject.id);
      setError(null);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("projects.page.deleteTaskError")));
    }
  };

  const addLabel =
    activeTab === "projects"
      ? t("pages.projects.addProject")
      : t("pages.projects.inviteMember");

  const searchPlaceholder =
    activeTab === "projects"
      ? t("pages.projects.searchPlaceholder")
      : t("projects.invitations.searchPlaceholder");

  if (projectId) {
    if (detailLoading && !selectedProject) {
      return (
        <div className="hr-card mx-6 mt-4 p-10 text-center text-sm text-hr-muted">
          {t("common.loading")}
        </div>
      );
    }

    if (!selectedProject) {
      return (
        <div className="mx-6 mt-4 space-y-4">
          <StatusBanner
            variant="error"
            message={error || t("projects.page.loadDetailError")}
          />
          <button
            type="button"
            onClick={() => {
              goBackToProjectList();
              void loadListData();
            }}
            className="rounded-xl bg-hr-primary px-4 py-2 text-sm font-medium text-white"
          >
            {t("projects.detail.backLabel")}
          </button>
        </div>
      );
    }

    return (
      <>
        {error && (
          <StatusBanner variant="error" message={error} className="mx-6 mt-4" />
        )}

        <ProjectDetailView
          project={selectedProject}
          taskStats={taskStats}
          onBack={() => {
            goBackToProjectList();
            void loadListData();
          }}
          onEdit={() => {
            setEditingProject(selectedProject);
            setIsProjectModalOpen(true);
          }}
          onDelete={() => void handleDeleteProject(selectedProject)}
          onAddTask={(sectionId) => {
            setEditingTask(null);
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
          onMoveSection={(sectionId, direction) =>
            void handleMoveSection(sectionId, direction)
          }
          onEditTask={(task) => {
            setEditingTask(task);
            setDefaultTaskSectionId(task.sectionId);
            setIsTaskModalOpen(true);
          }}
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
          sections={selectedProject.sections}
          nextDisplayOrder={
            selectedProject.sections.length
              ? Math.max(...selectedProject.sections.map((s) => s.displayOrder)) + 1
              : 1
          }
          onClose={() => {
            setIsSectionModalOpen(false);
            setEditingSection(null);
          }}
          onSubmit={async (payload) => {
            if (editingSection) {
              await updateSection(
                selectedProject.id,
                editingSection.id,
                payload,
              );
            } else {
              await addSection(selectedProject.id, payload);
            }
            await refreshSelectedProject(selectedProject.id);
            await loadListData();
          }}
        />

        {selectedProject && (
          <AddTaskModal
            isOpen={isTaskModalOpen}
            project={selectedProject}
            task={editingTask}
            defaultSectionId={defaultTaskSectionId}
            onClose={() => {
              setIsTaskModalOpen(false);
              setDefaultTaskSectionId(undefined);
              setEditingTask(null);
            }}
            onSubmit={async (payload) => {
              if (editingTask) {
                await updateTask(selectedProject.id, editingTask.id, payload);
              } else {
                await addTask(selectedProject.id, payload);
              }
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
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <StatusBanner variant="error" message={error} className="mb-4" />
        )}

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
          addLabel={addLabel}
          searchPlaceholder={searchPlaceholder}
        />

        <ProjectStatsCards stats={stats} />
        <ProjectsViewTabs activeTab={activeTab} onChange={setActiveTab} />

        {loading ? (
          <div className="hr-card p-10 text-center text-sm text-hr-muted">
            {t("common.loading")}
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
                setError(
                  getThrownErrorMessage(err, t("projects.page.loadError")),
                );
              }
            }}
            onReject={async (invitation) => {
              try {
                await updateInvitationStatus(invitation, "rejected");
                await loadListData();
              } catch (err) {
                setError(
                  getThrownErrorMessage(err, t("projects.page.loadError")),
                );
              }
            }}
            onCancel={async (invitation) => {
              try {
                await updateInvitationStatus(invitation, "cancelled");
                await loadListData();
              } catch (err) {
                setError(
                  getThrownErrorMessage(err, t("projects.page.loadError")),
                );
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
