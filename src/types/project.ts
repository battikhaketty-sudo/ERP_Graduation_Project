export type ProjectStatus = "not_started" | "in_progress" | "completed";

export type InvitationStatus = "pending" | "accepted" | "rejected";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProjectSection = {
  id: string;
  projectId: string;
  name: string;
  displayOrder: number;
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
};

export type Project = {
  id: string;
  number: number;
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
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  projectName: string;
  projectNumber: number;
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
};

export type TaskFormPayload = {
  title: string;
  description: string;
  sectionId: string;
  expectedHours: number;
  dueDate: string;
  priority: TaskPriority;
  assigneeIds: string[];
  assigneeNames: string[];
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
