/**
 * Generates Mermaid architecture diagram from decision tree data.
 * Maps node_id prefixes to architectural layers.
 */

// Layer definitions with colors and ordering
const LAYER_CONFIG = {
  security: { name: 'Security', color: '#ef4444', order: 1 },
  data: { name: 'Data', color: '#f59e0b', order: 2 },
  api: { name: 'API', color: '#10b981', order: 3 },
  architecture: { name: 'Architecture', color: '#3b82f6', order: 4 },
  infrastructure: { name: 'Infrastructure', color: '#8b5cf6', order: 5 }
};

// Map node_id prefixes to layer keys
const PREFIX_TO_LAYER = {
  auth: 'security',
  security: 'security',
  sec: 'security',          // Security decisions (SEC-XXX)
  db: 'data',
  database: 'data',
  data: 'data',
  tech: 'data',             // Technology decisions (TECH-XXX)
  api: 'api',
  endpoint: 'api',
  rest: 'api',
  arch: 'architecture',
  pattern: 'architecture',
  design: 'architecture',
  deploy: 'infrastructure',
  infra: 'infrastructure',
  infrastr: 'infrastructure',
  cloud: 'infrastructure',
  ci: 'infrastructure',
  cd: 'infrastructure'
};

/**
 * Categorize a decision into an architectural layer based on node_id prefix.
 * @param {Object} decision - Decision object with node_id
 * @returns {string} Layer key
 */
export function categorizeDecision(decision) {
  if (!decision || !decision.node_id) {
    return 'architecture'; // Default fallback
  }
  
  const prefix = decision.node_id.split(/[-_]/)[0].toLowerCase();
  return PREFIX_TO_LAYER[prefix] || 'architecture';
}

/**
 * Group decisions by architectural layer in display order.
 * @param {Array} decisions - Array of decision objects
 * @returns {Object} Decisions grouped by layer key
 */
export function groupDecisionsByLayer(decisions) {
  const groups = {};
  
  if (!Array.isArray(decisions)) {
    return groups;
  }
  
  decisions.forEach(decision => {
    const layer = categorizeDecision(decision);
    if (!groups[layer]) {
      groups[layer] = [];
    }
    groups[layer].push(decision);
  });
  
  return groups;
}

/**
 * Sanitize text for Mermaid diagram (escape special characters).
 * @param {string} text - Raw text
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Sanitized text
 */
function sanitizeForMermaid(text, maxLength = 30) {
  if (!text) return 'Unknown';
  
  // Remove/replace problematic characters
  let sanitized = text
    .replace(/["\[\](){}|<>`]/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized || 'Unknown';
}

/**
 * Generate a valid Mermaid node ID from decision data.
 * @param {Object} decision - Decision object
 * @param {number} index - Fallback index
 * @returns {string} Valid node ID
 */
function generateNodeId(decision, index) {
  if (decision.node_id) {
    // Convert to valid Mermaid ID (alphanumeric and underscores only)
    return decision.node_id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  return `node_${index}`;
}

/**
 * Generate Mermaid diagram definition from decision tree and tech stack.
 * @param {Array} decisionTree - Array of decision objects
 * @param {Array} techStack - Array of tech stack strings
 * @returns {string} Mermaid diagram definition or empty string if no data
 */
export function generateArchitectureDiagram(decisionTree = [], techStack = []) {
  const hasDecisions = Array.isArray(decisionTree) && decisionTree.length > 0;
  const hasTechStack = Array.isArray(techStack) && techStack.length > 0;
  
  if (!hasDecisions && !hasTechStack) {
    return '';
  }
  
  const groupedDecisions = groupDecisionsByLayer(decisionTree);
  const usedLayers = Object.keys(groupedDecisions)
    .sort((a, b) => (LAYER_CONFIG[a]?.order || 99) - (LAYER_CONFIG[b]?.order || 99));
  
  // Build subgraphs for each layer
  const subgraphs = [];
  const connections = [];
  
  usedLayers.forEach(layer => {
    const config = LAYER_CONFIG[layer];
    const decisions = groupedDecisions[layer];
    
    if (!config || !decisions || decisions.length === 0) return;
    
    const nodes = decisions.map((d, i) => {
      const nodeId = generateNodeId(d, i);
      const label = sanitizeForMermaid(d.decision || d.chosen || 'Decision');
      return `    ${nodeId}["${label}"]`;
    }).join('\n');
    
    subgraphs.push(`  subgraph ${layer} ["${config.name} Layer"]
${nodes}
  end`);
    
    // Add styling for this layer
    decisions.forEach((d, i) => {
      const nodeId = generateNodeId(d, i);
      subgraphs.push(`  style ${nodeId} fill:${config.color}33,stroke:${config.color},stroke-width:2px`);
    });
  });
  
  // Add tech stack box if available
  if (hasTechStack) {
    const techLabel = techStack.slice(0, 6).join('\\n');
    subgraphs.push(`  subgraph tech ["Tech Stack"]
    techstack["${techLabel}"]
  end
  style techstack fill:#6366f133,stroke:#6366f1,stroke-width:2px`);
  }
  
  // Generate connections between layers (top to bottom flow)
  for (let i = 0; i < usedLayers.length - 1; i++) {
    const currentLayer = usedLayers[i];
    const nextLayer = usedLayers[i + 1];
    const currentDecisions = groupedDecisions[currentLayer] || [];
    const nextDecisions = groupedDecisions[nextLayer] || [];
    
    // Connect last node of current layer to first node of next layer
    if (currentDecisions.length > 0 && nextDecisions.length > 0) {
      const fromId = generateNodeId(currentDecisions[currentDecisions.length - 1], currentDecisions.length - 1);
      const toId = generateNodeId(nextDecisions[0], 0);
      connections.push(`  ${fromId} --> ${toId}`);
    }
  }
  
  // Connect last layer to tech stack if available
  if (hasTechStack && usedLayers.length > 0) {
    const lastLayer = usedLayers[usedLayers.length - 1];
    const lastDecisions = groupedDecisions[lastLayer] || [];
    if (lastDecisions.length > 0) {
      const fromId = generateNodeId(lastDecisions[lastDecisions.length - 1], lastDecisions.length - 1);
      connections.push(`  ${fromId} -.-> techstack`);
    }
  }
  
  // Assemble the diagram
  const diagram = `graph TB
${subgraphs.join('\n')}
${connections.join('\n')}`;
  
  return diagram;
}

export default generateArchitectureDiagram;
