'use strict';

/**
 * Database Module - Main Entry Point
 *
 * Re-exports all database functionality from modular components.
 * This provides backward compatibility with the original database.js interface.
 */

const connection = require('./connection');
const projects = require('./repository/projects');
const tasks = require('./repository/tasks');
const sync = require('./repository/sync');
const { getStatistics, exportToJson, importFromJson } = require('./statistics');
const query = require('./utils/query');

// Re-export everything for backward compatibility
module.exports = {
  // Lifecycle
  initDatabase: connection.initDatabase,
  closeDatabase: connection.closeDatabase,
  getDb: connection.getDb,

  // Projects
  upsertProject: projects.upsertProject,
  getAllProjects: projects.getAllProjects,
  getProject: projects.getProject,
  deleteProject: projects.deleteProject,
  hardDeleteProject: projects.hardDeleteProject,

  // Tasks
  createTask: tasks.createTask,
  updateTask: tasks.updateTask,
  getTask: tasks.getTask,
  getTasksByProject: tasks.getTasksByProject,
  getPendingTasks: tasks.getPendingTasks,
  getRecentCompletedTasks: tasks.getRecentCompletedTasks,
  cleanupOldTasks: tasks.cleanupOldTasks,

  // Sync
  getSyncState: sync.getSyncState,
  updateSyncState: sync.updateSyncState,

  // Statistics
  getStatistics,
  exportToJson,
  importFromJson,

  // Raw queries
  runAsync: query.runAsync,
  getAsync: query.getAsync,
  allAsync: query.allAsync,
  execAsync: query.execAsync,
};
