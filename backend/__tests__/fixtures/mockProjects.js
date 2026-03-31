/**
 * Mock project data fixtures for testing
 */

/**
 * Create a mock project state object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock project state
 */
export function createMockProject(overrides = {}) {
  return {
    project_name: 'test-project',
    editor_used: 'claude',
    progress_percentage: 50,
    implementation_plan: [
      { step: '1', task: 'Setup project structure', status: 'done' },
      { step: '2', task: 'Implement core features', status: 'in_progress' },
      { step: '3', task: 'Write tests', status: 'pending' },
    ],
    decision_tree: [
      {
        node_id: 'arch-1',
        decision: 'Database choice',
        chosen: 'SQLite',
        reason: 'Lightweight and portable',
      },
    ],
    tests_generated: [
      { test_name: 'unit test', status: 'passed', file: 'tests/unit.test.js' },
      { test_name: 'integration test', status: 'pending', file: 'tests/integration.test.js' },
    ],
    ...overrides,
  };
}

/**
 * Create multiple mock projects
 * @param {number} count - Number of projects to create
 * @returns {Array} Array of mock projects
 */
export function createMockProjects(count) {
  return Array.from({ length: count }, (_, i) =>
    createMockProject({
      project_name: `project-${i + 1}`,
      progress_percentage: Math.min(100, i * 25),
    })
  );
}

/**
 * Create a mock implementation plan
 * @param {number} stepCount - Number of steps
 * @param {string} defaultStatus - Default status for all steps
 * @returns {Array} Mock implementation plan
 */
export function createMockImplementationPlan(stepCount = 5, defaultStatus = 'pending') {
  return Array.from({ length: stepCount }, (_, i) => ({
    step: String(i + 1),
    task: `Task ${i + 1}`,
    status: defaultStatus,
  }));
}

/**
 * Create a mock task object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock task
 */
export function createMockTask(overrides = {}) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    project_name: 'test-project',
    type: 'create-tests',
    status: 'pending',
    progress: 0,
    message: 'Test task',
    ...overrides,
  };
}
