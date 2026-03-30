/**
 * Task Service
 * Business logic for async task management
 */

'use strict';

const taskRepository = require('../repositories/task.repository');

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<string>} Task ID
 */
async function createTask(taskData) {
  return taskRepository.create(taskData);
}

/**
 * Update task progress
 * @param {string} taskId - Task ID
 * @param {Object} update - Update data
 * @returns {Promise<void>}
 */
async function updateTaskProgress(taskId, update) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const updates = {};
  if (update.progress !== undefined) updates.progress = update.progress;
  if (update.message !== undefined) updates.message = update.message;
  if (update.status !== undefined) updates.status = update.status;

  await taskRepository.update(taskId, updates);

  return { ...task, ...updates };
}

/**
 * Complete a task
 * @param {string} taskId - Task ID
 * @param {Object} completion - Completion data
 * @returns {Promise<Object>} Updated task
 */
async function completeTask(taskId, completion) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  await taskRepository.update(taskId, {
    status: 'completed',
    progress: 100,
    result: completion.result ? JSON.stringify(completion.result) : null,
    report: completion.report || null,
  });

  return { ...task, status: 'completed', progress: 100, ...completion };
}

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task
 */
async function getTaskById(taskId) {
  return taskRepository.findById(taskId);
}

/**
 * Get tasks by project
 * @param {string} projectName - Project name
 * @param {string} [status] - Filter by status
 * @returns {Promise<Array>} Tasks
 */
async function getTasksByProject(projectName, status) {
  return taskRepository.findByProject(projectName, status);
}

/**
 * Get pending tasks
 * @returns {Promise<Array>} Pending tasks
 */
async function getPendingTasks() {
  return taskRepository.findPending();
}

/**
 * Get recent completed tasks
 * @param {number} [limit=50] - Max number
 * @returns {Promise<Array>} Completed tasks
 */
async function getRecentCompletedTasks(limit = 50) {
  return taskRepository.findRecentCompleted(limit);
}

/**
 * Get tasks based on filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Tasks
 */
async function getTasks(filters = {}) {
  const { projectName, status } = filters;

  if (projectName) {
    return getTasksByProject(projectName, status);
  }

  if (status === 'pending') {
    return getPendingTasks();
  }

  return getRecentCompletedTasks(50);
}

module.exports = {
  createTask,
  updateTaskProgress,
  completeTask,
  getTaskById,
  getTasksByProject,
  getPendingTasks,
  getRecentCompletedTasks,
  getTasks,
};
