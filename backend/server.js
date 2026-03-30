/**
 * PM Dashboard Server
 * Entry point - initializes and starts the server
 */

'use strict';

const path = require('path');
const { getConfig } = require('./lib/config');
const { getPaths, ensureDirectories, isOpenClawEnvironment } = require('./lib/paths');
const db = require('./lib/database');
const { GitSync } = require('./lib/sync');
const { createApp } = require('./app');
const { setupWebSocket } = require('./websocket');
const { createFileWatcherService } = require('./services/fileWatcher.service');
const { SyncService } = require('./services/sync.service');

let fileWatcher = null;
let syncInterval = null;

function initSync(config, paths, io) {
  if (!config.sync.enabled) return null;

  const gitSync = new GitSync({ stateDir: path.dirname(paths.stateFile), config: config.sync });

  if (!gitSync.isGitRepo()) {
    console.log('[Sync] Git not initialized');
    return null;
  }

  if (config.sync.intervalMs > 0) {
    syncInterval = setInterval(async () => {
      try {
        const result = await gitSync.sync();
        console.log(result.success ? '[Sync] Sync completed' : `[Sync] Failed: ${result.message}`);
      } catch (error) {
        console.error('[Sync] Error:', error.message);
      }
    }, config.sync.intervalMs);
  }

  return gitSync;
}

async function shutdown(signal, server) {
  console.log(`\n[Server] ${signal} received, shutting down...`);
  if (syncInterval) clearInterval(syncInterval);
  if (fileWatcher) await fileWatcher.close();
  await db.closeDatabase();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

async function start() {
  console.log('========================================');
  console.log('     PM Dashboard Server v1.0.1        ');
  console.log('========================================\n');

  const config = getConfig();
  const paths = getPaths(config);

  console.log(`[Server] OpenClaw: ${isOpenClawEnvironment() ? 'Detected' : 'Not detected'}`);
  console.log(`[Server] Projects: ${paths.projectsDir}`);
  console.log(`[Server] Database: ${paths.stateFile}\n`);

  ensureDirectories(paths);
  await db.initDatabase(paths.stateFile);

  const { app, server } = createApp(config);
  app.locals.paths = paths;

  const { io, setPaths } = setupWebSocket(server, config);
  setPaths(paths);
  app.locals.io = io;

  fileWatcher = createFileWatcherService({
    projectsDir: paths.projectsDir,
    ignorePatterns: config.watcher.ignorePatterns,
    io,
  });
  fileWatcher.init();

  const gitSync = initSync(config, paths, io);
  if (gitSync) app.locals.syncService = new SyncService(gitSync, config.sync);

  server.listen(config.server.port, config.server.host, () => {
    console.log(`\n✓ Dashboard running at http://${config.server.host}:${config.server.port}\n`);
  });

  process.on('SIGTERM', () => shutdown('SIGTERM', server));
  process.on('SIGINT', () => shutdown('SIGINT', server));
}

start().catch(err => {
  console.error('[Server] Startup failed:', err);
  process.exit(1);
});
