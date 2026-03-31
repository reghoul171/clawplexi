'use strict';

/**
 * Tasks Repository
 * Handles all task-related database operations
 */

const { runAsync, getAsync, allAsync } = require('../utils/query');

/**
 * Create a new task
 * @param {Object} task - Task data
 * @returns {Promise<string>} - Task ID
 */
async function createTask(task) {
  const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await runAsync(
    `
    INSERT INTO tasks (id, project_name, type, status, progress, message, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)
  `,
    [taskId, task.project_name, task.type, task.message || '', now, now]
  );

  return taskId;
}

/**
 * Update task status/progress
 * @param {string} taskId - Task ID
 * @param {Object} update - Update data
 */
async function updateTask(taskId, update) {
  const fields = ['updated_at = ?'];
  const values = [new Date().toISOString()];

  if (update.status !== undefined) {
    fields.push('status = ?');
    values.push(update.status);
  }
  if (update.progress !== undefined) {
    fields.push('progress = ?');
    values.push(update.progress);
  }
  if (update.message !== undefined) {
    fields.push('message = ?');
    values.push(update.message);
  }
  if (update.result !== undefined) {
    fields.push('result = ?');
    values.push(update.result);
  }
  if (update.report !== undefined) {
    fields.push('report = ?');
    values.push(update.report);
  }
  if (update.status === 'completed' || update.status === 'failed') {
    fields.push('completed_at = ?');
    values.push(new Date().toISOString());
  }

  values.push(taskId);
  await runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
}

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>}
 */
async function getTask(taskId) {
  const row = await getAsync('SELECT * FROM tasks WHERE id = ?', [taskId]);
  return row || null;
}

/**
 * Get tasks by project
 * @param {string} projectName - Project name
 * @param {string} [status] - Filter by status
 * @returns {Promise<Array>}
 */
async function getTasksByProject(projectName, status = null) {
  let sql = 'SELECT * FROM tasks WHERE project_name = ?';
  const params = [projectName];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  return allAsync(sql, params);
}

/**
 * Get pending tasks
 * @returns {Promise<Array>}
 */
async function getPendingTasks() {
  return allAsync(
    "SELECT * FROM tasks WHERE status IN ('pending', 'running') ORDER BY created_at ASC"
  );
}

/**
 * Get recent completed tasks
 * @param {number} [limit=20] - Max number of tasks
 * @returns {Promise<Array>}
 */
async function getRecentCompletedTasks(limit = 20) {
  return allAsync(
    "SELECT * FROM tasks WHERE status IN ('completed', 'failed') ORDER BY completed_at DESC LIMIT ?",
    [limit]
  );
}

/**
 * Clean up old completed tasks
 * @param {number} [daysOld=7] - Delete tasks older than this
 */
async function cleanupOldTasks(daysOld = 7) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  const result = await runAsync(
    "DELETE FROM tasks WHERE status IN ('completed', 'failed') AND completed_at < ?",
    [cutoff]
  );
  return result.changes;
}

module.exports = {
  createTask,
  updateTask,
  getTask,
  getTasksByProject,
  getPendingTasks,
  getRecentCompletedTasks,
  cleanupOldTasks,
};
