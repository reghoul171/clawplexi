/**
 * Path Resolution Module
 *
 * Centralizes all path resolution for the PM Dashboard.
 * Supports ~ expansion, environment variables, and config file overrides.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Default paths relative to home directory
 */
const DEFAULT_PATHS = {
  projectsDir: '~/.openclaw/shared-project',
  stateFile: '~/.openclaw/pm-dashboard/state.db',
  logsDir: '~/.openclaw/pm-dashboard/logs',
  configFile: '~/.openclaw/pm-dashboard/config.json',
  projectsStateDir: '~/.openclaw/pm-dashboard/projects',
};

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  projectsDir: 'PM_DASHBOARD_PROJECTS_DIR',
  stateFile: 'PM_DASHBOARD_STATE_FILE',
  logsDir: 'PM_DASHBOARD_LOGS_DIR',
  configFile: 'PM_DASHBOARD_CONFIG_FILE',
  projectsStateDir: 'PM_DASHBOARD_PROJECTS_STATE_DIR',
};

/**
 * Resolve a path that may contain ~ or be relative
 * @param {string} p - Path to resolve
 * @param {string} [basePath] - Base path for relative paths (defaults to cwd)
 * @returns {string} - Absolute path
 */
function resolvePath(p, basePath) {
  if (!p) return p;

  // Expand ~ to home directory
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }

  // Already absolute
  if (path.isAbsolute(p)) {
    return p;
  }

  // Relative to basePath or cwd
  const base = basePath || process.cwd();
  return path.resolve(base, p);
}

/**
 * Get paths with all overrides applied
 * Order of precedence (highest to lowest):
 * 1. Environment variables
 * 2. Config file
 * 3. Defaults
 *
 * @param {Object} [config] - Configuration object from config file
 * @returns {Object} - Resolved paths
 */
function getPaths(config = {}) {
  const pathsConfig = config.paths || {};
  const result = {};

  for (const [key, defaultPath] of Object.entries(DEFAULT_PATHS)) {
    let resolvedPath;

    // Check environment variable first
    const envVar = ENV_MAPPINGS[key];
    if (envVar && process.env[envVar]) {
      resolvedPath = process.env[envVar];
    }
    // Then check config file
    else if (pathsConfig[key]) {
      resolvedPath = pathsConfig[key];
    }
    // Fall back to default
    else {
      resolvedPath = defaultPath;
    }

    result[key] = resolvePath(resolvedPath);
  }

  return result;
}

/**
 * Ensure all required directories exist
 * @param {Object} paths - Resolved paths object
 */
function ensureDirectories(paths) {
  const dirsToCreate = [
    paths.logsDir,
    path.dirname(paths.stateFile),
    path.dirname(paths.configFile),
    paths.projectsStateDir,
  ];

  for (const dir of dirsToCreate) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Paths] Created directory: ${dir}`);
    }
  }
}

/**
 * Get the OpenClaw home directory
 * @returns {string}
 */
function getOpenClawHome() {
  return path.join(os.homedir(), '.openclaw');
}

/**
 * Get the shared-project directory from OpenClaw config
 * Falls back to default if not found
 * @returns {string}
 */
function getSharedProjectPath() {
  const openclawConfigPath = path.join(getOpenClawHome(), 'openclaw.json');

  try {
    if (fs.existsSync(openclawConfigPath)) {
      const config = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));

      // Check if agents.defaults.workspace exists and derive shared-project
      if (config.agents?.defaults?.workspace) {
        // Typically workspace is ~/.openclaw/workspace, shared-project is sibling
        const workspaceDir = config.agents.defaults.workspace;
        const openclawDir = path.dirname(workspaceDir);
        const sharedProject = path.join(openclawDir, 'shared-project');
        if (fs.existsSync(sharedProject)) {
          return sharedProject;
        }
      }
    }
  } catch (error) {
    console.warn('[Paths] Could not read OpenClaw config:', error.message);
  }

  // Fall back to default
  return resolvePath(DEFAULT_PATHS.projectsDir);
}

/**
 * Check if we're running inside OpenClaw environment
 * @returns {boolean}
 */
function isOpenClawEnvironment() {
  return fs.existsSync(getOpenClawHome());
}

module.exports = {
  resolvePath,
  getPaths,
  ensureDirectories,
  getOpenClawHome,
  getSharedProjectPath,
  isOpenClawEnvironment,
  DEFAULT_PATHS,
  ENV_MAPPINGS,
};
