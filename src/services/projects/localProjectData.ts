/** Shared localStorage keys for project client-side data. */
export const PROJECT_TASKS_KEY = "hr_project_tasks";
export const PROJECT_SECTION_IDS_KEY = "hr_project_section_ids";
export const PROJECT_FLOW_ANCHORS_KEY = "hr_project_flow_anchors";
export const PROJECT_SECTION_DEPS_KEY = "hr_project_section_deps";
export const PROJECT_SECTION_EDGE_LABELS_KEY = "hr_project_section_edge_labels";
export const PROJECT_TASK_TRANSITIONS_KEY = "hr_project_task_transitions";

/** Clear all project client caches (call on logout). */
export const clearAllLocalProjectData = () => {
  try {
    localStorage.removeItem(PROJECT_TASKS_KEY);
    localStorage.removeItem(PROJECT_SECTION_IDS_KEY);
    localStorage.removeItem("hr_performance_points");
    localStorage.removeItem(PROJECT_FLOW_ANCHORS_KEY);
    localStorage.removeItem(PROJECT_SECTION_DEPS_KEY);
    localStorage.removeItem(PROJECT_SECTION_EDGE_LABELS_KEY);
    localStorage.removeItem(PROJECT_TASK_TRANSITIONS_KEY);
  } catch {
    // ignore storage failures
  }
};
