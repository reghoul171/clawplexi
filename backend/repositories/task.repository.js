/**
 * Task Repository
 * Database operations for async tasks
 */

'use strict';

const db = require('../lib/database');

/**
 * Create a new task
 * @param {Object} task - Task data
 * @returns {Promise<string>} Task ID
 */
async function create(task) {
  return db.createTask(task);
}

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {Object} update - Update data
 * @returns {Promise<void>}
 */
async function update(taskId, update) {
  return db.updateTask(taskId, update);
}

/**
 * Get a task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null
 */
async function findById(taskId) {
  return db.getTask(taskId);
}

/**
 * Get tasks by project name
 * @param {string} projectName - Project name
 * @param {string} [status] - Filter by status
 * @returns {Promise<Array>} Array of tasks
 */
async function findByProject(projectName, status = null) {
  return db.getTasksByProject(projectName, status);
}

/**
 * Get all pending tasks
 * @returns {Promise<Array>} Array of pending tasks
 */
async function findPending() {
  return db.getPendingTasks();
}

/**
 * Get recent completed tasks
 * @param {number} [limit=20] - Max number of tasks
 * @returns {Promise<Array>} Array of completed tasks
 */
async function findRecentCompleted(limit = 20) {
  return db.getRecentCompletedTasks(limit);
}

/**
 * Clean up old completed tasks
 * @param {number} [daysOld=7] - Delete tasks older than this
 * @returns {Promise<number>} Number of deleted tasks
 */
async function cleanupOld(daysOld = 7) {
  return db.cleanupOldTasks(daysOld);
}

module.exports = {
  create,
  update,
  findById,
  findByProject,
  findPending,
  findRecentCompleted,
  cleanupOld,
};
