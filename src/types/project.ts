export type ProjectStatus = "not_started" | "in_progress" | "completed";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

/** Recorded when a task moves from one section to another. */
export type TaskTransition = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  fromSectionId: string;
  fromSectionName: string;
  toSectionId: string;
  toSectionName: string;
  /** ISO-8601 UTC timestamp */
  createdAtUtc: string;
};

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
  expectedHours: number;
  startDate: string;
  dueDate: string;
  assigneeIds: string[];
  assigneeNames: string[];
  /** Task ids that should be done before this task (display / planning graph). */
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
  lateTasksCount: number;
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
  /** Labels on arrows from prerequisite section → this section (keyed by prerequisite id). */
  dependencyEdgeLabels?: Record<string, string>;
};

export type TaskFormPayload = {
  title: string;
  description: string;
  sectionId: string;
  expectedHours: number;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
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
  late: number;
};

export type MemberFormPayload = {
  role: string;
};
