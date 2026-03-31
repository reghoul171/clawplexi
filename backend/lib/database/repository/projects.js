'use strict';

/**
 * Projects Repository
 * Handles all project-related database operations
 */

const { runAsync, getAsync, allAsync } = require('../utils/query');

/**
 * Insert related data (steps, decisions, tests)
 */
async function insertRelatedData(projectId, state) {
  // Insert implementation steps
  if (state.implementation_plan && state.implementation_plan.length > 0) {
    for (const step of state.implementation_plan) {
      await runAsync(
        `
        INSERT INTO implementation_steps (project_id, step_number, task, status)
        VALUES (?, ?, ?, ?)
      `,
        [projectId, step.step, step.task, step.status]
      );
    }
  }

  // Insert decision tree
  if (state.decision_tree && state.decision_tree.length > 0) {
    for (const decision of state.decision_tree) {
      await runAsync(
        `
        INSERT INTO decision_tree (project_id, node_id, decision, chosen, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
        [projectId, decision.node_id, decision.decision, decision.chosen, decision.reason]
      );
    }
  }

  // Insert test results
  if (state.tests_generated && state.tests_generated.length > 0) {
    for (const test of state.tests_generated) {
      await runAsync(
        `
        INSERT INTO test_results (project_id, test_name, status, file_path)
        VALUES (?, ?, ?, ?)
      `,
        [projectId, test.test_name, test.status, test.file]
      );
    }
  }
}

/**
 * Upsert a project state
 * @param {Object} state - Project state object
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<number>} - Project ID
 */
async function upsertProject(state, projectPath) {
  const stateJson = JSON.stringify(state);
  const now = new Date().toISOString();

  // Check if project exists
  const existing = await getAsync('SELECT id FROM projects WHERE name = ?', [state.project_name]);

  if (existing) {
    // Update existing project
    await runAsync(
      `
      UPDATE projects 
      SET state_json = ?, 
          progress_percentage = ?, 
          editor_used = ?,
          last_modified = ?,
          is_active = TRUE
      WHERE id = ?
    `,
      [stateJson, state.progress_percentage, state.editor_used, now, existing.id]
    );

    // Delete old related data
    await runAsync('DELETE FROM implementation_steps WHERE project_id = ?', [existing.id]);
    await runAsync('DELETE FROM decision_tree WHERE project_id = ?', [existing.id]);
    await runAsync('DELETE FROM test_results WHERE project_id = ?', [existing.id]);

    // Insert new related data
    await insertRelatedData(existing.id, state);

    return existing.id;
  } else {
    // Insert new project
    const result = await runAsync(
      `
      INSERT INTO projects (name, path, state_json, progress_percentage, editor_used, created_at, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        state.project_name,
        projectPath,
        stateJson,
        state.progress_percentage,
        state.editor_used,
        now,
        now,
      ]
    );

    // Insert related data
    await insertRelatedData(result.id, state);

    return result.id;
  }
}

/**
 * Get all projects
 * @returns {Promise<Array>}
 */
async function getAllProjects() {
  const rows = await allAsync(`
    SELECT id, name, path, state_json, progress_percentage, editor_used, last_modified, created_at, is_active
    FROM projects
    WHERE is_active = TRUE
    ORDER BY last_modified DESC
  `);

  return rows.map(row => ({
    ...JSON.parse(row.state_json),
    _db: {
      id: row.id,
      path: row.path,
      last_modified: row.last_modified,
      created_at: row.created_at,
    },
  }));
}

/**
 * Get a single project by name
 * @param {string} name - Project name
 * @returns {Promise<Object|null>}
 */
async function getProject(name) {
  const row = await getAsync(
    `
    SELECT id, name, path, state_json, progress_percentage, editor_used, last_modified, created_at
    FROM projects
    WHERE name = ? AND is_active = TRUE
  `,
    [name]
  );

  if (!row) return null;

  return {
    ...JSON.parse(row.state_json),
    _db: {
      id: row.id,
      path: row.path,
      last_modified: row.last_modified,
      created_at: row.created_at,
    },
  };
}

/**
 * Delete a project (soft delete)
 * @param {string} name - Project name
 * @returns {Promise<boolean>}
 */
async function deleteProject(name) {
  const result = await runAsync(
    `
    UPDATE projects SET is_active = FALSE WHERE name = ?
  `,
    [name]
  );

  return result.changes > 0;
}

/**
 * Hard delete a project
 * @param {string} name - Project name
 * @returns {Promise<boolean>}
 */
async function hardDeleteProject(name) {
  const result = await runAsync('DELETE FROM projects WHERE name = ?', [name]);
  return result.changes > 0;
}

module.exports = {
  upsertProject,
  getAllProjects,
  getProject,
  deleteProject,
  hardDeleteProject,
};
