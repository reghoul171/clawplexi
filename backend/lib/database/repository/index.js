'use strict';

/**
 * Repository Index
 * Re-exports all repository functions for convenient access
 */

const projects = require('./projects');
const tasks = require('./tasks');
const sync = require('./sync');

module.exports = {
  ...projects,
  ...tasks,
  ...sync,
};
