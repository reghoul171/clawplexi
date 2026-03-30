/**
 * Middleware Index
 * Exports all middleware components
 */

'use strict';

const { errorHandler, notFoundHandler } = require('./error.middleware');
const { requestLogger } = require('./logging.middleware');
const { getCorsOriginHandler, createCorsOptions } = require('./cors.middleware');

module.exports = {
  // Error handling
  errorHandler,
  notFoundHandler,

  // Logging
  requestLogger,

  // CORS
  getCorsOriginHandler,
  createCorsOptions,
};
