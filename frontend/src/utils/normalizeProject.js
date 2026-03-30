/**
 * Normalizes project data with defaults for missing fields.
 * Provides graceful degradation for legacy project schemas.
 */

const DEFAULTS = {
  project_description: 'No description available',
  repository_url: null,
  tech_stack: [],
  start_date: null,
  team_size: 1,
  lines_of_code: 0,
  progress_percentage: 0,
  implementation_plan: [],
  decision_tree: [],
  tests_generated: [],
  editor_used: 'Unknown',
};

export function normalizeProject(project) {
  if (!project) return null;

  const metadata = project.metadata || {};

  return {
    ...DEFAULTS,
    ...project,
    // Extract from top-level or metadata fallback
    tech_stack: Array.isArray(project.tech_stack)
      ? project.tech_stack
      : Array.isArray(metadata.tech_stack)
        ? metadata.tech_stack
        : [],
    team_size: project.team_size ?? metadata.team_size ?? DEFAULTS.team_size,
    lines_of_code: project.lines_of_code ?? metadata.lines_of_code ?? DEFAULTS.lines_of_code,
    start_date: project.start_date ?? metadata.start_date ?? DEFAULTS.start_date,
    // Ensure arrays are always arrays
    implementation_plan: Array.isArray(project.implementation_plan)
      ? project.implementation_plan
      : [],
    decision_tree: Array.isArray(project.decision_tree) ? project.decision_tree : [],
    tests_generated: Array.isArray(project.tests_generated) ? project.tests_generated : [],
  };
}

export default normalizeProject;
