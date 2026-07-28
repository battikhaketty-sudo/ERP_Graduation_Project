export type ProjectStatus = "not_started" | "in_progress" | "completed";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "todo" | "in_progress" | "completed";

export type ProjectSection = {
  id: string;
  projectId: string;
  name: string;
  displayOrder: number;
  createdAt?: string;
  /** Section ids that should complete before this stage (local workflow graph). */
  dependsOnSectionIds: string[];
};

export type ProjectMember = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  joinedAt: string;
  leftAt: string;
  rowNumber?: number;
};

export type ProjectTask = {
  id: string;
  projectId: string;
  sectionId: string;
  number: number;
  name: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  expectedHours: number;
  startDate: string;
  dueDate: string;
  assigneeIds: string[];
  assigneeNames: string[];
  /** Task ids that must be completed before this task is unblocked. */
  dependsOnTaskIds: string[];
};

export type Project = {
  id: string;
  number: string;
  name: string;
  managerId: string;
  managerName: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: number;
  rating: number;
  goals: string[];
  sections: ProjectSection[];
  tasks: ProjectTask[];
  tasksCount?: number;
  sectionsCount?: number;
  membersCount?: number;
  createdAt?: string;
};

export type ProjectDetailStats = {
  membersCount: number;
  tasksCount: number;
  sectionsCount: number;
  completedTasksCount: number;
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  projectName: string;
  projectNumber: string;
  employeeId: string;
  employeeName: string;
  role: string;
  message?: string;
  status: InvitationStatus;
  startDate: string;
  endDate: string;
  invitedAt: string;
  expiresAt: string;
};

export type ProjectFormPayload = {
  name: string;
  managerId: string;
  managerName: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: number;
};

export type InvitationFormPayload = {
  projectId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  message?: string;
  expiresAt: string;
};

export type SectionFormPayload = {
  name: string;
  displayOrder: number;
  dependsOnSectionIds?: string[];
};

export type TaskFormPayload = {
  title: string;
  description: string;
  sectionId: string;
  expectedHours: number;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeIds: string[];
  assigneeNames: string[];
  dependsOnTaskIds?: string[];
};

export type ProjectStats = {
  projectsCount: number;
  tasksCount: number;
  sectionsCount: number;
  assignedEmployeesCount: number;
};

export type TaskStats = {
  total: number;
  inProgress: number;
  completed: number;
  late: number;
};

export type MemberFormPayload = {
  role: string;
};
