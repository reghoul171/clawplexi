/**
 * Transform flat project list into workspace → spaces → lists hierarchy
 */

/**
 * Determine status from progress percentage
 */
function getStatusFromProgress(progress) {
  if (progress >= 100) return 'done';
  if (progress > 0) return 'in_progress';
  return 'pending';
}

/**
 * Count completed items from implementation plan
 */
function countCompletedSteps(implementationPlan) {
  if (!implementationPlan || !Array.isArray(implementationPlan)) return 0;
  return implementationPlan.filter(step => step.status === 'done' || step.status === 'completed').length;
}

/**
 * Transform a single project into a space with lists
 */
function projectToSpace(project) {
  const completedSteps = countCompletedSteps(project.implementation_plan);
  const totalSteps = project.implementation_plan?.length || 0;
  
  // Create lists from the project
  const lists = [];
  
  // Main implementation list
  if (totalSteps > 0) {
    lists.push({
      id: `impl-${project.project_name}`,
      name: 'Implementation',
      itemCount: totalSteps,
      completedCount: completedSteps,
      status: getStatusFromProgress(project.progress_percentage),
      project: project // Reference to original project
    });
  }
  
  // Tests list
  const testCount = project.tests_generated?.length || 0;
  if (testCount > 0) {
    const passedTests = project.tests_generated?.filter(t => t.status === 'passed').length || 0;
    lists.push({
      id: `tests-${project.project_name}`,
      name: 'Tests',
      itemCount: testCount,
      completedCount: passedTests,
      status: passedTests === testCount ? 'done' : 'in_progress',
      project: project
    });
  }
  
  // Decision tree list
  const decisionCount = project.decision_tree?.length || 0;
  if (decisionCount > 0) {
    const madeDecisions = project.decision_tree?.filter(d => d.decision).length || 0;
    lists.push({
      id: `decisions-${project.project_name}`,
      name: 'Decisions',
      itemCount: decisionCount,
      completedCount: madeDecisions,
      status: madeDecisions === decisionCount ? 'done' : 'in_progress',
      project: project
    });
  }
  
  // If no lists, create a default one
  if (lists.length === 0) {
    lists.push({
      id: `main-${project.project_name}`,
      name: 'Main',
      itemCount: 1,
      completedCount: project.progress_percentage >= 100 ? 1 : 0,
      status: getStatusFromProgress(project.progress_percentage),
      project: project
    });
  }
  
  return {
    id: `space-${project.project_name}`,
    name: project.project_name,
    icon: 'FolderKanban',
    color: 'text-purple-400',
    lists,
    progress: project.progress_percentage,
    editor: project.editor_used
  };
}

/**
 * Transform flat project list into workspace structure
 * @param {Array} projects - Flat list of projects
 * @returns {Object} Workspace structure with spaces and lists
 */
export function transformToWorkspace(projects) {
  if (!projects || !Array.isArray(projects)) {
    return {
      name: 'PM Dashboard',
      spaces: [],
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0
    };
  }
  
  // Transform each project into a space
  const spaces = projects.map(projectToSpace);
  
  // Calculate stats
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.progress_percentage >= 100).length;
  const activeProjects = totalProjects - completedProjects;
  
  return {
    name: 'PM Dashboard',
    spaces,
    totalProjects,
    activeProjects,
    completedProjects
  };
}

/**
 * Find a project from a list ID
 * @param {Array} projects - Flat list of projects
 * @param {string} listId - The list ID to find
 * @returns {Object|null} The project or null
 */
export function findProjectByListId(projects, listId) {
  if (!projects || !listId) return null;
  
  // Extract project name from list ID (format: type-projectName)
  const parts = listId.split('-');
  if (parts.length < 2) return null;
  
  const projectName = parts.slice(1).join('-');
  return projects.find(p => p.project_name === projectName) || null;
}

export default { transformToWorkspace, findProjectByListId };
