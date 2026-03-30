/**
 * Request Logging Middleware
 */

'use strict';

/**
 * Request logger - logs all incoming requests with timestamp
 */
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}

module.exports = {
  requestLogger,
};
