/**
 * Configuration Module
 * 
 * Handles loading, merging, and accessing configuration from multiple sources.
 * Configuration precedence: CLI args > Environment > Config file > Defaults
 */

const fs = require('fs');
const path = require('path');
const { resolvePath, getOpenClawHome, isOpenClawEnvironment } = require('./paths');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  version: '1.0.0',
  server: {
    port: 3001,
    host: 'localhost',
    corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173']
  },
  frontend: {
    port: 5173,
    apiUrl: 'http://localhost:3001'
  },
  paths: {
    projectsDir: '~/.openclaw/shared-project',
    stateFile: '~/.openclaw/pm-dashboard/state.db',
    logsDir: '~/.openclaw/pm-dashboard/logs',
    configFile: '~/.openclaw/pm-dashboard/config.json',
    projectsStateDir: '~/.openclaw/pm-dashboard/projects'
  },
  sync: {
    enabled: true,
    method: 'git',
    intervalMs: 30000,
    remote: 'origin',
    branch: 'main',
    autoCommit: true
  },
  watcher: {
    ignorePatterns: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store'
    ]
  },
  logging: {
    level: 'info',
    console: true,
    file: true
  }
};

/**
 * Environment variable mappings (flat structure to nested config)
 */
const ENV_MAPPINGS = {
  'PM_DASHBOARD_PORT': { path: 'server.port', type: 'number' },
  'PM_DASHBOARD_HOST': { path: 'server.host', type: 'string' },
  'PM_DASHBOARD_CORS_ORIGINS': { path: 'server.corsOrigins', type: 'array' },
  'PM_DASHBOARD_FRONTEND_PORT': { path: 'frontend.port', type: 'number' },
  'PM_DASHBOARD_API_URL': { path: 'frontend.apiUrl', type: 'string' },
  'PM_DASHBOARD_PROJECTS_DIR': { path: 'paths.projectsDir', type: 'string' },
  'PM_DASHBOARD_STATE_FILE': { path: 'paths.stateFile', type: 'string' },
  'PM_DASHBOARD_LOGS_DIR': { path: 'paths.logsDir', type: 'string' },
  'PM_DASHBOARD_SYNC_ENABLED': { path: 'sync.enabled', type: 'boolean' },
  'PM_DASHBOARD_SYNC_INTERVAL': { path: 'sync.intervalMs', type: 'number' },
  'PM_DASHBOARD_LOG_LEVEL': { path: 'logging.level', type: 'string' },
  'PM_DASHBOARD_CONFIG_FILE': { path: '_configFile', type: 'string' }
};

/**
 * Set a nested value in an object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-notation path (e.g., 'server.port')
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Get a nested value from an object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path
 * @param {*} defaultValue - Default value if not found
 * @returns {*}
 */
function getNestedValue(obj, path, defaultValue = undefined) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || !(part in current)) {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Convert string to specified type
 * @param {string} value - String value
 * @param {string} type - Target type
 * @returns {*}
 */
function convertType(value, type) {
  switch (type) {
    case 'number':
      return parseInt(value, 10);
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'array':
      return value.split(',').map(s => s.trim());
    case 'string':
    default:
      return value;
  }
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Load configuration from file
 * @param {string} configPath - Path to config file
 * @returns {Object|null}
 */
function loadConfigFile(configPath) {
  const resolvedPath = resolvePath(configPath);
  
  try {
    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`[Config] Failed to load config from ${resolvedPath}:`, error.message);
  }
  
  return null;
}

/**
 * Load environment variables into config
 * @returns {Object}
 */
function loadEnvironmentConfig() {
  const envConfig = {};
  
  for (const [envVar, mapping] of Object.entries(ENV_MAPPINGS)) {
    if (process.env[envVar] !== undefined) {
      const value = convertType(process.env[envVar], mapping.type);
      
      // Skip special _configFile key
      if (mapping.path === '_configFile') {
        continue;
      }
      
      setNestedValue(envConfig, mapping.path, value);
    }
  }
  
  return envConfig;
}

/**
 * Detect OpenClaw-specific configuration
 * @returns {Object}
 */
function detectOpenClawConfig() {
  const config = {};
  
  if (isOpenClawEnvironment()) {
    const openclawConfigPath = path.join(getOpenClawHome(), 'openclaw.json');
    
    try {
      if (fs.existsSync(openclawConfigPath)) {
        const openclawConfig = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
        
        // Use OpenClaw gateway URL if available
        if (openclawConfig.gateway?.port) {
          config.openclawGatewayUrl = `http://localhost:${openclawConfig.gateway.port}`;
        }
        
        // Use OpenClaw shared-project if our projectsDir is still default
        config.paths = config.paths || {};
        config.paths.projectsDir = path.join(getOpenClawHome(), 'shared-project');
      }
    } catch (error) {
      console.warn('[Config] Could not read OpenClaw config:', error.message);
    }
  }
  
  return config;
}

/**
 * Load and merge all configuration sources
 * @param {Object} options - Options
 * @param {string} [options.configFile] - Custom config file path
 * @param {Object} [options.overrides] - Manual overrides
 * @returns {Object}
 */
function loadConfig(options = {}) {
  // Determine config file path
  const configFile = options.configFile || 
                     process.env.PM_DASHBOARD_CONFIG_FILE || 
                     DEFAULT_CONFIG.paths.configFile;
  
  // Load from file
  const fileConfig = loadConfigFile(configFile) || {};
  
  // Load from environment
  const envConfig = loadEnvironmentConfig();
  
  // Detect OpenClaw environment
  const openclawConfig = detectOpenClawConfig();
  
  // Merge all sources (later overrides earlier)
  let merged = deepMerge(DEFAULT_CONFIG, openclawConfig);
  merged = deepMerge(merged, fileConfig);
  merged = deepMerge(merged, envConfig);
  
  // Apply manual overrides
  if (options.overrides) {
    merged = deepMerge(merged, options.overrides);
  }
  
  // Store the config file path
  merged._configFile = resolvePath(configFile);
  merged._loadedAt = new Date().toISOString();
  
  return merged;
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration to save
 * @param {string} [configFile] - Config file path
 */
function saveConfig(config, configFile) {
  const filePath = resolvePath(configFile || config._configFile || DEFAULT_CONFIG.paths.configFile);
  const dir = path.dirname(filePath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Remove internal fields before saving
  const toSave = { ...config };
  delete toSave._configFile;
  delete toSave._loadedAt;
  
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2));
  console.log(`[Config] Saved configuration to ${filePath}`);
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConfig(config) {
  const errors = [];
  
  // Validate server port
  if (config.server?.port) {
    const port = config.server.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push(`Invalid server port: ${port}`);
    }
  }
  
  // Validate sync interval
  if (config.sync?.intervalMs) {
    const interval = config.sync.intervalMs;
    if (!Number.isInteger(interval) || interval < 1000) {
      errors.push(`Invalid sync interval: ${interval} (must be >= 1000ms)`);
    }
  }
  
  // Validate logging level
  const validLevels = ['debug', 'info', 'warn', 'error'];
  if (config.logging?.level && !validLevels.includes(config.logging.level)) {
    errors.push(`Invalid logging level: ${config.logging.level}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Singleton instance
let configInstance = null;

/**
 * Get or create singleton config instance
 * @param {Object} [options] - Options for initial load
 * @returns {Object}
 */
function getConfig(options) {
  if (!configInstance || options?.reload) {
    configInstance = loadConfig(options);
  }
  return configInstance;
}

module.exports = {
  loadConfig,
  saveConfig,
  validateConfig,
  getConfig,
  getNestedValue,
  setNestedValue,
  deepMerge,
  DEFAULT_CONFIG,
  ENV_MAPPINGS
};
