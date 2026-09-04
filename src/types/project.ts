export type ProjectStatus = "not_started" | "in_progress" | "completed";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskDependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

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

export type TaskDependency = {
  taskId: string;
  taskTitle: string;
  dependencyType: TaskDependencyType;
  createdAt: string;
};

export type TaskAssignment = {
  memberId: string;
  employeeId: string;
  employeeName: string;
  assignedAt: string;
};

export type ProjectSection = {
  id: string;
  projectId: string;
  name: string;
  displayOrder: number;
  createdAt?: string;
  /**
   * When true, tasks in this section are treated as completed.
   * A project may have more than one final section.
   */
  isFinalSection: boolean;
};

export type ProjectMember = {
  /** Project membership id — send this in task `assignments`. */
  id: string;
  memberId: string;
  employeeId: string;
  userId?: string;
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
  sectionName?: string;
  number: number;
  name: string;
  title: string;
  description: string;
  priority: TaskPriority;
  expectedHours: number;
  startDate: string;
  dueDate: string;
  createdAt?: string;
  assigneeIds: string[];
  assigneeNames: string[];
  /** Task ids that should be done before this task (display / planning graph). */
  dependsOnTaskIds: string[];
  dependencyCount?: number;
  assignmentCount?: number;
  transitionCount?: number;
};

/** One edge from GET /project-tasks/dependencies (task ← predecessor). */
export type ProjectTaskGraphEdge = {
  id: string;
  /** Dependent task (must wait for the predecessor). */
  taskId: string;
  taskTitle: string;
  /** Previous task that should finish first. */
  predecessorId: string;
  predecessorTitle: string;
  dependencyType: TaskDependencyType;
  task: ProjectTask | null;
  predecessor: ProjectTask | null;
};

/** Full task payload from GET /project-tasks/{id}. */
export type ProjectTaskDetail = ProjectTask & {
  assignments: TaskAssignment[];
  dependencies: TaskDependency[];
  transitions: TaskTransition[];
};

export type Project = {
  id: string;
  number: string;
  name: string;
  managerId: string;
  managerName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  sections: ProjectSection[];
  tasks: ProjectTask[];
  tasksCount?: number;
  sectionsCount?: number;
  membersCount?: number;
  createdAt?: string;
};

export type ProjectDetailStats = {
  membersCount?: number;
  tasksCount?: number;
  sectionsCount?: number;
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
  /** When the invitee accepted/rejected (if available from API). */
  respondedAt: string;
  invitedAt: string;
  expiresAt: string;
};

export type ProjectFormPayload = {
  name: string;
  managerId: string;
  managerName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
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
  /** Marks the section as a final/completion stage (API: IsFinalSection). */
  isFinalSection: boolean;
};

export type TaskDependencyDraft = {
  predecessorId: string;
  type: TaskDependencyType;
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
  dependencies?: TaskDependencyDraft[];
};

export type ProjectStats = {
  projectsCount?: number;
  tasksCount?: number;
  sectionsCount?: number;
  assignedEmployeesCount?: number;
};

export type TaskStats = {
  total: number;
  late: number;
};

export type MemberFormPayload = {
  role: string;
};
