#!/usr/bin/env node

/**
 * PM Dashboard CLI
 * 
 * Command-line interface for managing the PM Dashboard.
 * Handles configuration, export/import, and server management.
 */

const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Load lib modules
const libDir = path.join(__dirname, '..', 'lib');
const { getConfig, saveConfig, validateConfig, getNestedValue, setNestedValue, DEFAULT_CONFIG } = require(path.join(libDir, 'config'));
const { getPaths, ensureDirectories, resolvePath, isOpenClawEnvironment, getOpenClawHome } = require(path.join(libDir, 'paths'));

/**
 * Print usage information
 */
function printHelp() {
  console.log(`
PM Dashboard CLI - Project Manager Dashboard Management Tool

Usage: pm-dashboard <command> [options]

Commands:
  start [options]        Start the dashboard server
  stop                   Stop the dashboard server
  status                 Show dashboard status
  config <action>        Manage configuration
  export [options]       Export dashboard state
  import <file>          Import dashboard state
  init [options]         Initialize dashboard for first use
  migrate <action>       Migration utilities

Start Options:
  --port <port>          Server port (default: 3001)
  --host <host>          Server host (default: localhost)
  --no-sync              Disable Git sync
  --detach, -d           Run in background

Config Actions:
  get <key>              Get a config value (dot notation)
  set <key> <value>      Set a config value
  list                   Show all configuration
  path                   Show config file path
  reset                  Reset to default configuration

Export Options:
  --output, -o <file>    Output file (default: pm-dashboard-export.json)
  --format <format>      Export format: json|tar.gz (default: json)

Import Options:
  --merge                Merge with existing data (default: replace)
  --validate             Validate import file without importing

Init Options:
  --remote <url>         Git remote URL for sync
  --openclaw             Initialize as OpenClaw skill

Migrate Actions:
  check                  Check migration requirements
  export                 Export for migration (same as 'export')
  clone <url>            Clone existing state from remote

Examples:
  pm-dashboard start --port 8080
  pm-dashboard config get server.port
  pm-dashboard config set sync.enabled true
  pm-dashboard export -o backup.json
  pm-dashboard import backup.json --merge
  pm-dashboard init --remote git@github.com:user/pm-dashboard-state.git

Environment Variables:
  PM_DASHBOARD_PORT              Server port
  PM_DASHBOARD_HOST              Server host
  PM_DASHBOARD_CONFIG_FILE       Custom config file path
  PM_DASHBOARD_PROJECTS_DIR      Projects directory
  PM_DASHBOARD_STATE_FILE        SQLite database path
  PM_DASHBOARD_SYNC_ENABLED      Enable/disable sync (true/false)
`);
}

/**
 * Start the dashboard server
 */
function startServer(options) {
  const config = getConfig();
  
  // Apply CLI overrides
  if (options.port) {
    config.server.port = parseInt(options.port, 10);
  }
  if (options.host) {
    config.server.host = options.host;
  }
  if (options.noSync) {
    config.sync.enabled = false;
  }
  
  // Ensure directories exist
  const paths = getPaths(config);
  ensureDirectories(paths);
  
  console.log('[PM Dashboard] Starting server...');
  console.log(`[PM Dashboard] Config: ${config._configFile}`);
  console.log(`[PM Dashboard] Port: ${config.server.port}`);
  console.log(`[PM Dashboard] Projects: ${paths.projectsDir}`);
  
  if (options.detach) {
    // Fork the server process
    const { spawn } = require('child_process');
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    const child = spawn(process.execPath, [serverPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PM_DASHBOARD_PORT: config.server.port.toString(),
        PM_DASHBOARD_HOST: config.server.host
      }
    });
    
    child.unref();
    console.log(`[PM Dashboard] Server started in background (PID: ${child.pid})`);
    
    // Save PID for later
    const pidFile = path.join(paths.logsDir, 'server.pid');
    fs.writeFileSync(pidFile, child.pid.toString());
    console.log(`[PM Dashboard] PID file: ${pidFile}`);
  } else {
    // Run in foreground - require and run server
    require('../server');
  }
}

/**
 * Stop the dashboard server
 */
function stopServer() {
  const paths = getPaths();
  const pidFile = path.join(paths.logsDir, 'server.pid');
  
  if (!fs.existsSync(pidFile)) {
    console.log('[PM Dashboard] No PID file found. Server may not be running.');
    return;
  }
  
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
  
  try {
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(pidFile);
    console.log(`[PM Dashboard] Server stopped (PID: ${pid})`);
  } catch (error) {
    if (error.code === 'ESRCH') {
      console.log('[PM Dashboard] Server process not found. Cleaning up PID file.');
      fs.unlinkSync(pidFile);
    } else {
      console.error('[PM Dashboard] Failed to stop server:', error.message);
    }
  }
}

/**
 * Show dashboard status
 */
function showStatus() {
  const config = getConfig();
  const paths = getPaths(config);
  
  console.log('\n=== PM Dashboard Status ===\n');
  
  // Configuration
  console.log('Configuration:');
  console.log(`  Config file: ${config._configFile}`);
  console.log(`  Loaded at: ${config._loadedAt}`);
  
  // Server
  console.log('\nServer:');
  console.log(`  Host: ${config.server.host}`);
  console.log(`  Port: ${config.server.port}`);
  
  // Check if server is running
  const pidFile = path.join(paths.logsDir, 'server.pid');
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
    try {
      process.kill(pid, 0); // Check if process exists
      console.log(`  Status: Running (PID: ${pid})`);
    } catch {
      console.log('  Status: Stopped (stale PID file)');
    }
  } else {
    console.log('  Status: Not running');
  }
  
  // Paths
  console.log('\nPaths:');
  console.log(`  Projects: ${paths.projectsDir}`);
  console.log(`  Database: ${paths.stateFile}`);
  console.log(`  Logs: ${paths.logsDir}`);
  
  // Check paths exist
  console.log(`  Projects dir exists: ${fs.existsSync(paths.projectsDir)}`);
  console.log(`  Database exists: ${fs.existsSync(paths.stateFile)}`);
  
  // Sync
  console.log('\nSync:');
  console.log(`  Enabled: ${config.sync.enabled}`);
  console.log(`  Method: ${config.sync.method}`);
  console.log(`  Interval: ${config.sync.intervalMs}ms`);
  
  // OpenClaw environment
  console.log('\nOpenClaw:');
  console.log(`  Detected: ${isOpenClawEnvironment()}`);
  if (isOpenClawEnvironment()) {
    console.log(`  Home: ${getOpenClawHome()}`);
  }
  
  // Validation
  const validation = validateConfig(config);
  console.log('\nValidation:');
  if (validation.valid) {
    console.log('  Status: Valid');
  } else {
    console.log('  Status: Invalid');
    validation.errors.forEach(err => console.log(`  Error: ${err}`));
  }
  
  console.log('');
}

/**
 * Handle config commands
 */
function handleConfig(action, ...params) {
  const config = getConfig();
  
  switch (action) {
    case 'get': {
      const key = params[0];
      if (!key) {
        console.error('Error: Key is required');
        console.log('Usage: pm-dashboard config get <key>');
        console.log('Example: pm-dashboard config get server.port');
        process.exit(1);
      }
      
      const value = getNestedValue(config, key);
      if (value === undefined) {
        console.log(`Key '${key}' not found`);
      } else if (typeof value === 'object') {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(value);
      }
      break;
    }
    
    case 'set': {
      const key = params[0];
      const value = params[1];
      
      if (!key || value === undefined) {
        console.error('Error: Key and value are required');
        console.log('Usage: pm-dashboard config set <key> <value>');
        console.log('Example: pm-dashboard config set server.port 8080');
        process.exit(1);
      }
      
      // Parse value
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(value) && value !== '') parsedValue = Number(value);
      
      setNestedValue(config, key, parsedValue);
      saveConfig(config);
      console.log(`Set ${key} = ${parsedValue}`);
      break;
    }
    
    case 'list': {
      const displayConfig = { ...config };
      delete displayConfig._configFile;
      delete displayConfig._loadedAt;
      console.log(JSON.stringify(displayConfig, null, 2));
      break;
    }
    
    case 'path': {
      console.log(config._configFile);
      break;
    }
    
    case 'reset': {
      const configPath = config._configFile;
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log(`Deleted config file: ${configPath}`);
      }
      console.log('Configuration reset to defaults');
      break;
    }
    
    default:
      console.error(`Unknown config action: ${action}`);
      console.log('Valid actions: get, set, list, path, reset');
      process.exit(1);
  }
}

/**
 * Export dashboard state
 */
function exportState(options) {
  const config = getConfig();
  const paths = getPaths(config);
  const outputFile = options.output || 'pm-dashboard-export.json';
  
  console.log('[PM Dashboard] Exporting state...');
  
  // Load database module dynamically to avoid initialization issues
  const db = require(path.join(libDir, 'database'));
  
  db.initDatabase(paths.stateFile).then(async () => {
    try {
      const data = await db.exportToJson();
      
      // Write to file
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`[PM Dashboard] Exported ${data.projects.length} projects to ${outputFile}`);
      
      await db.closeDatabase();
    } catch (error) {
      console.error('[PM Dashboard] Export failed:', error.message);
      process.exit(1);
    }
  });
}

/**
 * Import dashboard state
 */
function importState(inputFile, options) {
  if (!inputFile) {
    console.error('Error: Input file is required');
    console.log('Usage: pm-dashboard import <file> [--merge]');
    process.exit(1);
  }
  
  const resolvedPath = resolvePath(inputFile);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  console.log(`[PM Dashboard] Importing from ${resolvedPath}...`);
  
  const config = getConfig();
  const paths = getPaths(config);
  const db = require(path.join(libDir, 'database'));
  
  // Read import file
  const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  
  if (options.validate) {
    console.log('[PM Dashboard] Validating import file...');
    console.log(`  Version: ${data.version}`);
    console.log(`  Exported: ${data.exportedAt}`);
    console.log(`  Projects: ${data.projects?.length || 0}`);
    console.log('[PM Dashboard] Validation complete');
    return;
  }
  
  db.initDatabase(paths.stateFile).then(async () => {
    try {
      await db.importFromJson(data, options.merge);
      console.log(`[PM Dashboard] Imported ${data.projects.length} projects`);
      await db.closeDatabase();
    } catch (error) {
      console.error('[PM Dashboard] Import failed:', error.message);
      process.exit(1);
    }
  });
}

/**
 * Initialize dashboard
 */
function initDashboard(options) {
  const silent = options.silent;
  const log = silent ? () => {} : console.log.bind(console);
  const warn = silent ? () => {} : console.warn.bind(console);
  
  const config = getConfig();
  const paths = getPaths(config);
  
  log('[PM Dashboard] Initializing...');
  
  // Ensure directories
  ensureDirectories(paths);
  log('[PM Dashboard] Created directories');
  
  // Initialize Git sync if remote provided
  if (options.remote) {
    const { GitSync } = require(path.join(libDir, 'sync'));
    const gitSync = new GitSync({
      stateDir: path.dirname(paths.stateFile),
      config: config.sync
    });
    
    const result = gitSync.clone(options.remote);
    if (result.success) {
      log(`[PM Dashboard] Cloned state from ${options.remote}`);
    } else {
      warn(`[PM Dashboard] Git init failed: ${result.message}`);
      log('[PM Dashboard] Continuing without Git sync...');
    }
  }
  
  // Create initial config if needed
  if (!fs.existsSync(config._configFile)) {
    saveConfig(config);
    log(`[PM Dashboard] Created config: ${config._configFile}`);
  }
  
  if (!silent) {
    console.log('\n[PM Dashboard] Initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Place .project_state.json files in your projects directory');
    console.log(`     Projects directory: ${paths.projectsDir}`);
    console.log('  2. Start the dashboard: pm-dashboard start');
    console.log(`  3. Open http://localhost:${config.server.port} in your browser`);
  }
}

/**
 * Handle migration commands
 */
function handleMigrate(action, ...params) {
  switch (action) {
    case 'check': {
      const config = getConfig();
      const paths = getPaths(config);
      
      console.log('[PM Dashboard] Migration Check\n');
      
      // Check what needs to be migrated
      const checks = [
        { name: 'OpenClaw environment', pass: isOpenClawEnvironment() },
        { name: 'Config directory', pass: fs.existsSync(path.dirname(paths.configFile)) },
        { name: 'Projects directory', pass: fs.existsSync(paths.projectsDir) },
        { name: 'Database file', pass: fs.existsSync(paths.stateFile) }
      ];
      
      for (const check of checks) {
        console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
      }
      
      const allPassed = checks.every(c => c.pass);
      console.log(`\nStatus: ${allPassed ? 'Ready for migration' : 'Migration required'}`);
      break;
    }
    
    case 'clone': {
      const url = params[0];
      if (!url) {
        console.error('Error: Remote URL is required');
        console.log('Usage: pm-dashboard migrate clone <git-url>');
        process.exit(1);
      }
      
      initDashboard({ remote: url });
      break;
    }
    
    default:
      console.error(`Unknown migrate action: ${action}`);
      console.log('Valid actions: check, export, clone');
      process.exit(1);
  }
}

// Parse options from args
function parseOptions(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      
      // Handle short options
      const shortMap = { o: 'output', d: 'detach' };
      const mappedKey = shortMap[key] || key;
      
      if (nextArg && !nextArg.startsWith('-')) {
        options[mappedKey] = nextArg;
        i++;
      } else {
        options[mappedKey] = true;
      }
    }
  }
  
  return options;
}

// Main command router
const options = parseOptions(args.slice(1));

switch (command) {
  case 'start':
    startServer(options);
    break;
  
  case 'stop':
    stopServer();
    break;
  
  case 'status':
    showStatus();
    break;
  
  case 'config':
    handleConfig(args[1], ...args.slice(2));
    break;
  
  case 'export':
    exportState(options);
    break;
  
  case 'import':
    importState(args[1], options);
    break;
  
  case 'init':
    initDashboard(options);
    break;
  
  case 'migrate':
    handleMigrate(args[1], ...args.slice(2));
    break;
  
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "pm-dashboard help" for usage information.');
    process.exit(1);
}
