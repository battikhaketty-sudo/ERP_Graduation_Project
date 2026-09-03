import { ROUTES } from "./routes";

const withId = (path: string, id?: string | null, param = "id") => {
  const trimmed = id?.trim();
  if (!trimmed) return undefined;
  return `${path}?${param}=${encodeURIComponent(trimmed)}`;
};

export const employeePath = (id?: string | null) =>
  withId(ROUTES.employees, id);

export const projectPath = (id?: string | null) => withId(ROUTES.projects, id);

export const departmentPath = (id?: string | null) =>
  withId(ROUTES.departments, id);

export const projectTaskPath = (
  projectId?: string | null,
  taskId?: string | null,
) => {
  const project = projectPath(projectId);
  const trimmedTask = taskId?.trim();
  if (!project || !trimmedTask) return undefined;
  return `${project}&task=${encodeURIComponent(trimmedTask)}`;
};

export const projectSectionPath = (
  projectId?: string | null,
  sectionId?: string | null,
) => {
  const project = projectPath(projectId);
  const trimmedSection = sectionId?.trim();
  if (!project || !trimmedSection) return undefined;
  return `${project}&section=${encodeURIComponent(trimmedSection)}`;
};
