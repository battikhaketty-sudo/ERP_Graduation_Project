/** Shared localStorage keys for project client-side data. */
export const PROJECT_TASKS_KEY = "hr_project_tasks";
export const PROJECT_SECTION_IDS_KEY = "hr_project_section_ids";
export const PROJECT_POINTS_KEY = "hr_performance_points";
export const PROJECT_FLOW_ANCHORS_KEY = "hr_project_flow_anchors";
export const PROJECT_SECTION_DEPS_KEY = "hr_project_section_deps";

/** Clear all project client caches (call on logout). */
export const clearAllLocalProjectData = () => {
  try {
    localStorage.removeItem(PROJECT_TASKS_KEY);
    localStorage.removeItem(PROJECT_SECTION_IDS_KEY);
    localStorage.removeItem(PROJECT_POINTS_KEY);
    localStorage.removeItem(PROJECT_FLOW_ANCHORS_KEY);
    localStorage.removeItem(PROJECT_SECTION_DEPS_KEY);
  } catch {
    // ignore storage failures
  }
};
