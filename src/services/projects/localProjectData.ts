/** Client cache for GET /projects/{id}/sections leak filtering. */
export const PROJECT_SECTION_IDS_KEY = "hr_project_section_ids";
export const PROJECT_TASK_TRANSITIONS_KEY = "hr_project_task_transitions";
export const PROJECT_TASKS_KEY = "hr_project_tasks";
export const PROJECT_FLOW_ANCHORS_KEY = "hr_project_flow_anchors";
export const PROJECT_SECTION_DEPS_KEY = "hr_project_section_deps";
export const PROJECT_SECTION_EDGE_LABELS_KEY = "hr_project_section_edge_labels";

/** Clear project client caches (call on logout). */
export const clearAllLocalProjectData = () => {
  try {
    localStorage.removeItem(PROJECT_SECTION_IDS_KEY);
    localStorage.removeItem("hr_project_tasks");
    localStorage.removeItem("hr_performance_points");
    localStorage.removeItem("hr_project_flow_anchors");
    localStorage.removeItem("hr_project_section_deps");
    localStorage.removeItem("hr_project_section_edge_labels");
    localStorage.removeItem("hr_project_task_transitions");
    localStorage.removeItem("hr-archived-employees");
  } catch {
    // ignore storage failures
  }
};
