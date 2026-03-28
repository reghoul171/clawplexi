/**
 * Project State Helper
 * 
 * Utilities for reading and updating .project_state.json files
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Read a project's .project_state.json file
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} - Project state or null if not found
 */
async function readProjectState(projectPath) {
  const stateFile = path.join(projectPath, '.project_state.json');
  
  try {
    const content = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Update a project's .project_state.json file
 * @param {string} projectPath - Path to project directory
 * @param {Object} updates - Fields to update (merged with existing)
 * @returns {Promise<Object>} - Updated state
 */
async function updateProjectState(projectPath, updates) {
  const stateFile = path.join(projectPath, '.project_state.json');
  
  // Read existing state
  const existing = await readProjectState(projectPath);
  if (!existing) {
    throw new Error(`Project state not found at ${projectPath}`);
  }
  
  // Merge updates
  const updatedState = { ...existing, ...updates };
  
  // Write back atomically
  const tempFile = `${stateFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(updatedState, null, 2));
  await fs.rename(tempFile, stateFile);
  
  return updatedState;
}

/**
 * Update step status in implementation plan
 * @param {string} projectPath - Path to project directory
 * @param {string|number} stepId - Step identifier
 * @param {string} newStatus - New status ('pending'|'in_progress'|'done')
 * @returns {Promise<Object>} - Updated implementation_plan and metadata
 */
async function updateStepStatus(projectPath, stepId, newStatus) {
  const state = await readProjectState(projectPath);
  if (!state) {
    throw new Error('Project state not found');
  }
  
  if (!state.implementation_plan || !Array.isArray(state.implementation_plan)) {
    throw new Error('Implementation plan not found in project state');
  }
  
  const stepIndex = state.implementation_plan.findIndex(
    s => String(s.step) === String(stepId)
  );
  
  if (stepIndex === -1) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  const previousStatus = state.implementation_plan[stepIndex].status;
  
  const updatedPlan = state.implementation_plan.map(step =>
    String(step.step) === String(stepId)
      ? { ...step, status: newStatus }
      : step
  );
  
  await updateProjectState(projectPath, { implementation_plan: updatedPlan });
  
  return {
    updatedPlan,
    previousStatus,
    stepId
  };
}

module.exports = {
  readProjectState,
  updateProjectState,
  updateStepStatus
};
