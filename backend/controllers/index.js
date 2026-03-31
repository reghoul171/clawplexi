/**
 * Controllers Index
 * Exports all controller modules
 */

'use strict';

const projectsController = require('./projects.controller');
const syncController = require('./sync.controller');
const tasksController = require('./tasks.controller');

module.exports = {
  projects: projectsController,
  sync: syncController,
  tasks: tasksController,
};
