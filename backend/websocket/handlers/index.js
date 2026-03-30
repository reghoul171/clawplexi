/**
 * WebSocket Handlers Index
 * Exports all socket handler modules
 */

'use strict';

const projectHandlers = require('./project.handlers');

module.exports = {
  project: projectHandlers,
};
