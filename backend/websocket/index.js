/**
 * WebSocket Module
 * Socket.io server setup and connection handling
 */

'use strict';

const { Server } = require('socket.io');
const projectHandlers = require('./handlers/project.handlers');
const projectRepository = require('../repositories/project.repository');

/**
 * Setup WebSocket server
 * @param {Object} httpServer - HTTP server instance
 * @param {Object} config - Server configuration
 * @returns {Object} Socket.io server instance
 */
function setupWebSocket(httpServer, config) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.server.corsOrigins,
      methods: ['GET', 'POST'],
    },
    // Enable polling fallback for tunnel/proxy compatibility
    transports: ['polling', 'websocket'],
    // Allow upgrading to websocket after polling establishes connection
    allowUpgrades: true,
    // Increase ping timeout for slow connections through tunnels
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Store config for handlers
  let appPaths = null;

  // Method to set paths after initialization
  const setPaths = paths => {
    appPaths = paths;
  };

  io.on('connection', async socket => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send current state to newly connected client
    try {
      const projects = await projectRepository.findAll();
      socket.emit('initial_state', projects);
    } catch (error) {
      console.error('[Socket] Error sending initial state:', error);
    }

    // Register handlers with paths
    projectHandlers.register(io, socket, appPaths || {});

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return { io, setPaths };
}

module.exports = {
  setupWebSocket,
};
