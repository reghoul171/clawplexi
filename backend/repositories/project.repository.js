/**
 * Project Repository
 * Database operations for projects
 */

'use strict';

const db = require('../lib/database');

/**
 * Find all active projects
 * @returns {Promise<Array>} Array of project objects
 */
async function findAll() {
  return db.getAllProjects();
}

/**
 * Find a project by name
 * @param {string} name - Project name
 * @returns {Promise<Object|null>} Project object or null
 */
async function findByName(name) {
  return db.getProject(name);
}

/**
 * Upsert a project
 * @param {Object} projectData - Project state data
 * @param {string} projectPath - Path to project
 * @returns {Promise<number>} Project ID
 */
async function upsert(projectData, projectPath) {
  return db.upsertProject(projectData, projectPath);
}

/**
 * Soft delete a project
 * @param {string} name - Project name
 * @returns {Promise<boolean>} Success status
 */
async function softDelete(name) {
  return db.deleteProject(name);
}

/**
 * Hard delete a project
 * @param {string} name - Project name
 * @returns {Promise<boolean>} Success status
 */
async function hardDelete(name) {
  return db.hardDeleteProject(name);
}

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getStatistics() {
  return db.getStatistics();
}

module.exports = {
  findAll,
  findByName,
  upsert,
  softDelete,
  hardDelete,
  getStatistics,
};
