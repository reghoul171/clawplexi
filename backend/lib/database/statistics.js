'use strict';

/**
 * Statistics Module
 * Handles statistics, export, and import operations
 */

const { runAsync, getAsync, allAsync } = require('./utils/query');
const { upsertProject } = require('./repository/projects');
const { getSyncState } = require('./repository/sync');

/**
 * Get dashboard statistics
 * @returns {Promise<Object>}
 */
async function getStatistics() {
  const projectCount = await getAsync(
    'SELECT COUNT(*) as count FROM projects WHERE is_active = TRUE'
  );
  const stepsByStatus = await allAsync(`
    SELECT status, COUNT(*) as count 
    FROM implementation_steps 
    GROUP BY status
  `);
  const testsByStatus = await allAsync(`
    SELECT status, COUNT(*) as count 
    FROM test_results 
    GROUP BY status
  `);
  const avgProgress = await getAsync(`
    SELECT AVG(progress_percentage) as avg 
    FROM projects 
    WHERE is_active = TRUE
  `);

  const stepsStats = {};
  for (const row of stepsByStatus) {
    stepsStats[row.status] = row.count;
  }

  const testsStats = {};
  for (const row of testsByStatus) {
    testsStats[row.status] = row.count;
  }

  return {
    projectCount: projectCount?.count || 0,
    averageProgress: Math.round(avgProgress?.avg || 0),
    steps: stepsStats,
    tests: testsStats,
  };
}

/**
 * Export database to JSON
 * @returns {Promise<Object>}
 */
async function exportToJson() {
  const projects = await allAsync('SELECT * FROM projects WHERE is_active = TRUE');
  const syncState = await getSyncState();

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    projects: projects.map(p => ({
      name: p.name,
      path: p.path,
      state: JSON.parse(p.state_json),
      created_at: p.created_at,
      last_modified: p.last_modified,
    })),
    syncState,
  };
}

/**
 * Import data from JSON export
 * @param {Object} data - Exported data
 * @param {boolean} [merge=true] - Merge with existing or replace
 */
async function importFromJson(data, merge = true) {
  if (!merge) {
    // Clear existing data
    await runAsync('DELETE FROM implementation_steps');
    await runAsync('DELETE FROM decision_tree');
    await runAsync('DELETE FROM test_results');
    await runAsync('DELETE FROM projects');
  }

  for (const project of data.projects) {
    await upsertProject(project.state, project.path);
  }

  console.log(`[Database] Imported ${data.projects.length} projects`);
}

module.exports = {
  getStatistics,
  exportToJson,
  importFromJson,
};
