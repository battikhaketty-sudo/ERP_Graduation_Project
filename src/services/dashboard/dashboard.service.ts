import type { Project, ProjectInvitation, ProjectTask } from "../../types/project";
import { getAllInvitations, getAllProjects } from "../projects";
import {
  buildTaskStatsFromTasks,
  getProjectTasks,
} from "../projects/taskStorage";

export type DashboardTaskRef = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  priority: ProjectTask["priority"];
  status: ProjectTask["status"];
  assigneeNames: string[];
};

export type DashboardProjectProgress = {
  id: string;
  name: string;
  status: Project["status"];
  progress: number;
  endDate: string;
  overdue: boolean;
};

export type DashboardActivityItem = {
  id: string;
  kind: "project" | "invitation" | "alert";
  title: string;
  detail: string;
  at: string;
  href?: string;
};

export type DashboardSummary = {
  activeProjects: number;
  overdueTasks: number;
  completedThisWeek: number;
  pendingFollowUps: number;
  completionRate: number;
  overdueProjects: number;
  projectProgress: DashboardProjectProgress[];
  urgentTasks: DashboardTaskRef[];
  activities: DashboardActivityItem[];
  alerts: string[];
};

const dayKey = (value?: string | Date | null) => {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).trim().slice(0, 10);
};

const todayKey = () => dayKey(new Date());

const startOfWeekKey = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return dayKey(date);
};

const projectProgressPercent = (project: Project, tasks: ProjectTask[]) => {
  if (project.status === "completed") return 100;
  if (project.status === "not_started" && !tasks.length) return 0;
  if (!tasks.length) return project.status === "in_progress" ? 45 : 0;
  const stats = buildTaskStatsFromTasks(tasks, project.sections ?? []);
  if (!stats.total) return 0;
  return Math.round((stats.completed / stats.total) * 100);
};

const isActiveProject = (project: Project) => project.status !== "completed";
const isTaskOpen = (task: ProjectTask) => task.status !== "completed";

const isOverdueTask = (task: ProjectTask, today: string) => {
  const due = dayKey(task.dueDate);
  return Boolean(due && due < today && isTaskOpen(task));
};

const isUrgentToday = (task: ProjectTask, today: string) => {
  if (!isTaskOpen(task)) return false;
  const due = dayKey(task.dueDate);
  if (due === today) return true;
  if (task.priority === "urgent") return true;
  if (due && due < today) return true;
  return false;
};

const isCompletedThisWeek = (
  task: ProjectTask,
  weekStart: string,
  today: string,
) => {
  if (task.status !== "completed") return false;
  const due = dayKey(task.dueDate);
  const start = dayKey(task.startDate);
  const stamp = due || start;
  if (!stamp) return false;
  return stamp >= weekStart && stamp <= today;
};

const priorityRank: Record<ProjectTask["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const buildTaskRefs = (
  projects: Project[],
): Array<DashboardTaskRef & { task: ProjectTask }> => {
  const refs: Array<DashboardTaskRef & { task: ProjectTask }> = [];
  for (const project of projects) {
    const tasks = project.tasks?.length
      ? project.tasks
      : getProjectTasks(project.id, project.sections ?? []);
    for (const task of tasks) {
      refs.push({
        id: task.id,
        title: task.title || task.name,
        projectId: project.id,
        projectName: project.name,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        assigneeNames: task.assigneeNames,
        task,
      });
    }
  }
  return refs;
};

const buildActivities = (
  projects: Project[],
  invitations: ProjectInvitation[],
): DashboardActivityItem[] => {
  const items: DashboardActivityItem[] = [];

  for (const project of projects.slice(0, 8)) {
    items.push({
      id: `project-${project.id}`,
      kind: "project",
      title: project.name,
      detail: project.status,
      at: project.createdAt || project.startDate || "",
      href: `/projects?id=${encodeURIComponent(project.id)}`,
    });
  }

  for (const invitation of invitations.slice(0, 8)) {
    items.push({
      id: `invite-${invitation.id}`,
      kind: "invitation",
      title: invitation.employeeName,
      detail: `${invitation.projectName} · ${invitation.status}`,
      at: invitation.invitedAt || invitation.expiresAt || "",
      href: "/projects",
    });
  }

  return items
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 8);
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [projects, invitations] = await Promise.all([
    getAllProjects().catch(() => [] as Project[]),
    getAllInvitations().catch(() => [] as ProjectInvitation[]),
  ]);

  const today = todayKey();
  const weekStart = startOfWeekKey();
  const taskRefs = buildTaskRefs(projects);

  const activeProjectsList = projects.filter(isActiveProject);
  const overdueTasksList = taskRefs.filter((item) =>
    isOverdueTask(item.task, today),
  );
  const completedWeek = taskRefs.filter((item) =>
    isCompletedThisWeek(item.task, weekStart, today),
  );
  const pendingFollowUps = invitations.filter(
    (item) => item.status === "pending",
  );

  const completedTasks = taskRefs.filter(
    (item) => item.task.status === "completed",
  );
  const completionRate = taskRefs.length
    ? Math.round((completedTasks.length / taskRefs.length) * 100)
    : 0;

  const projectProgress: DashboardProjectProgress[] = activeProjectsList
    .map((project) => {
      const tasks = project.tasks?.length
        ? project.tasks
        : getProjectTasks(project.id, project.sections ?? []);
      const end = dayKey(project.endDate);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        progress: projectProgressPercent(project, tasks),
        endDate: project.endDate,
        overdue: Boolean(end && end < today && project.status !== "completed"),
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return a.progress - b.progress;
    })
    .slice(0, 6);

  const urgentTasks = taskRefs
    .filter((item) => isUrgentToday(item.task, today))
    .sort((a, b) => {
      const dueA = dayKey(a.dueDate) || "9999";
      const dueB = dayKey(b.dueDate) || "9999";
      if (dueA !== dueB) return dueA.localeCompare(dueB);
      return priorityRank[a.priority] - priorityRank[b.priority];
    })
    .slice(0, 6)
    .map(({ task: _task, ...rest }) => rest);

  const overdueProjects = projectProgress.filter((item) => item.overdue).length;
  const alerts: string[] = [];
  if (overdueProjects > 0) alerts.push("overdueProjects");
  if (overdueTasksList.length > 0) alerts.push("overdueTasks");
  if (pendingFollowUps.length > 0) alerts.push("pendingInvites");

  return {
    activeProjects: activeProjectsList.length,
    overdueTasks: overdueTasksList.length,
    completedThisWeek: completedWeek.length,
    pendingFollowUps: pendingFollowUps.length,
    completionRate,
    overdueProjects,
    projectProgress,
    urgentTasks,
    activities: buildActivities(projects, invitations),
    alerts,
  };
};
