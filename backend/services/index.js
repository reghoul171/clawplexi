/**
 * Service Index
 * Exports all service modules
 */

'use strict';

const projectService = require('./project.service');
const { SyncService } = require('./sync.service');
const taskService = require('./task.service');
const { createFileWatcherService } = require('./fileWatcher.service');
const testerService = require('./tester.service');

module.exports = {
  project: projectService,
  SyncService,
  task: taskService,
  createFileWatcherService,
  tester: testerService,
};
