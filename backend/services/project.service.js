/**
 * Project Service
 * Business logic for project operations
 */

'use strict';

const path = require('path');
const projectRepository = require('../repositories/project.repository');
const { updateProjectState, updateStepStatus, updateStep } = require('../lib/projectState');

/**
 * Get all projects
 * @returns {Promise<Array>} Array of projects
 */
async function getAllProjects() {
  return projectRepository.findAll();
}

/**
 * Get a project by name
 * @param {string} name - Project name
 * @returns {Promise<Object|null>} Project or null
 */
async function getProjectByName(name) {
  if (!name || name.trim() === '') {
    throw new Error('Project name cannot be empty');
  }
  return projectRepository.findByName(name);
}

/**
 * Update step status
 * @param {string} projectName - Project name
 * @param {string|number} stepNumber - Step number
 * @param {string} status - New status
 * @param {Object} paths - Resolved paths object
 * @returns {Promise<Object>} Update result
 */
async function updateStepStatusByName(projectName, stepNumber, status, paths) {
  // Validate status
  const validStatuses = ['pending', 'in_progress', 'done'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate project name
  if (!projectName || projectName.trim() === '') {
    throw new Error('Project name cannot be empty');
  }

  // Get project
  const project = await projectRepository.findByName(projectName);
  if (!project) {
    throw new Error('Project not found');
  }

  // Find step in implementation plan
  const stepExists = project.implementation_plan?.some(s => String(s.step) === String(stepNumber));

  if (!stepExists) {
    throw new Error(`Step ${stepNumber} not found`);
  }

  // Get previous status
  const previousStatus = project.implementation_plan.find(
    s => String(s.step) === String(stepNumber)
  )?.status;

  // Update step status in the plan
  const updatedPlan = project.implementation_plan.map(step =>
    String(step.step) === String(stepNumber) ? { ...step, status } : step
  );

  // Get project path
  const projectPath = project._db?.path || path.join(paths.projectsDir, projectName);

  // Update file if path exists
  try {
    await updateProjectState(projectPath, { implementation_plan: updatedPlan });
  } catch (fileError) {
    console.warn('[ProjectService] Could not update project file:', fileError.message);
    // Continue with database update only
  }

  // Update database
  const updatedProject = { ...project, implementation_plan: updatedPlan };
  await projectRepository.upsert(updatedProject, projectPath);

  return {
    success: true,
    step: { step: stepNumber, status, previousStatus },
    project: updatedProject,
  };
}

/**
 * Update a step (general update)
 * @param {string} projectName - Project name
 * @param {string|number} stepNumber - Step number
 * @param {Object} updates - Fields to update (task, status, etc.)
 * @param {Object} paths - Resolved paths object
 * @returns {Promise<Object>} Update result
 */
async function updateStepByName(projectName, stepNumber, updates, paths) {
  // Validate project name
  if (!projectName || projectName.trim() === '') {
    throw new Error('Project name cannot be empty');
  }

  // Validate status if provided
  if (updates.status !== undefined) {
    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(updates.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Get project
  const project = await projectRepository.findByName(projectName);
  if (!project) {
    throw new Error('Project not found');
  }

  // Find step in implementation plan
  const stepExists = project.implementation_plan?.some(s => String(s.step) === String(stepNumber));

  if (!stepExists) {
    throw new Error(`Step ${stepNumber} not found`);
  }

  // Get project path
  const projectPath = project._db?.path || path.join(paths.projectsDir, projectName);

  // Update step in file
  let result;
  try {
    result = await updateStep(projectPath, stepNumber, updates);
  } catch (fileError) {
    console.warn('[ProjectService] Could not update project file:', fileError.message);
    // Continue with database update only
    const previousStep = project.implementation_plan.find(s => String(s.step) === String(stepNumber));
    const updatedStep = { ...previousStep, ...updates, step: previousStep.step };
    result = {
      updatedPlan: project.implementation_plan.map(step =>
        String(step.step) === String(stepNumber) ? updatedStep : step
      ),
      previousStep,
      updatedStep,
      stepId: stepNumber,
    };
  }

  // Update database
  const updatedProject = { ...project, implementation_plan: result.updatedPlan };
  await projectRepository.upsert(updatedProject, projectPath);

  return {
    success: true,
    previousStep: result.previousStep,
    updatedStep: result.updatedStep,
    project: updatedProject,
  };
}

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Statistics
 */
async function getStatistics() {
  return projectRepository.getStatistics();
}

/**
 * Upsert a project
 * @param {Object} projectData - Project data
 * @param {string} projectPath - Project path
 * @returns {Promise<number>} Project ID
 */
async function upsertProject(projectData, projectPath) {
  return projectRepository.upsert(projectData, projectPath);
}

/**
 * Delete a project (soft delete)
 * @param {string} name - Project name
 * @returns {Promise<boolean>} Success
 */
async function deleteProject(name) {
  return projectRepository.softDelete(name);
}

module.exports = {
  getAllProjects,
  getProjectByName,
  updateStepStatusByName,
  updateStepByName,
  getStatistics,
  upsertProject,
  deleteProject,
};
