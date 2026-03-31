/**
 * Repository Index
 * Exports all repository modules
 */

'use strict';

const projectRepository = require('./project.repository');
const syncRepository = require('./sync.repository');
const taskRepository = require('./task.repository');

module.exports = {
  project: projectRepository,
  sync: syncRepository,
  task: taskRepository,
};
