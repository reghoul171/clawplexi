import { Hash, Zap, Tag } from 'lucide-react';

/**
 * Extract tags from task text like [API], [UI], [DB], etc.
 */
function extractTags(task) {
  const tagRegex = /\[([A-Za-z]+)\]/g;
  const tags = [];
  let match;
  
  while ((match = tagRegex.exec(task)) !== null) {
    tags.push(match[1].toUpperCase());
  }
  
  return tags;
}

/**
 * Estimate complexity based on task text length and keywords
 */
function estimateComplexity(task) {
  const taskLower = (task || '').toLowerCase();
  const wordCount = task.split(/\s+/).length;
  
  // Check for complexity keywords
  const complexKeywords = ['complex', 'integration', 'migration', 'refactor', 'architecture', 'multiple', 'comprehensive'];
  const simpleKeywords = ['simple', 'minor', 'quick', 'trivial', 'small', 'fix', 'update'];
  
  const hasComplexKeywords = complexKeywords.some(kw => taskLower.includes(kw));
  const hasSimpleKeywords = simpleKeywords.some(kw => taskLower.includes(kw));
  
  if (hasComplexKeywords || wordCount > 20) return 'high';
  if (hasSimpleKeywords || wordCount < 8) return 'low';
  return 'medium';
}

const complexityConfig = {
  low: { 
    label: 'Simple', 
    color: 'text-green-400', 
    bars: 1 
  },
  medium: { 
    label: 'Medium', 
    color: 'text-yellow-400', 
    bars: 2 
  },
  high: { 
    label: 'Complex', 
    color: 'text-red-400', 
    bars: 3 
  }
};

const tagColors = {
  API: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  UI: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  DB: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  AUTH: 'bg-red-500/20 text-red-300 border-red-500/30',
  TEST: 'bg-green-500/20 text-green-300 border-green-500/30',
  DOCS: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  CONFIG: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  DEFAULT: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
};

function getTagColor(tag) {
  return tagColors[tag] || tagColors.DEFAULT;
}

/**
 * ComplexityBars - Visual indicator for task complexity
 */
function ComplexityBars({ complexity }) {
  const config = complexityConfig[complexity] || complexityConfig.medium;
  
  return (
    <div className="flex items-center gap-0.5" title={`Complexity: ${config.label}`}>
      {[1, 2, 3].map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-sm transition-colors duration-200 ${
            bar <= config.bars 
              ? `h-3 ${config.color.replace('text-', 'bg-')}` 
              : 'h-2 bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * TaskMetadata - Display metadata on task cards
 * 
 * @param {Object} step - The step object containing step number, task text, etc.
 * @param {number} stepIndex - 0-based index of the step
 * @param {number} totalSteps - Total number of steps in the project
 */
export function TaskMetadata({ step, stepIndex = 0, totalSteps = 1 }) {
  const task = step?.task || '';
  const stepNumber = step?.step || (stepIndex + 1);
  const tags = extractTags(task);
  const complexity = estimateComplexity(task);
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
      {/* Step number badge */}
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-600/30 text-gray-400 rounded border border-gray-600/50">
        <Hash className="w-3 h-3" />
        <span>{stepNumber}/{totalSteps}</span>
      </span>
      
      {/* Complexity indicator */}
      <span className="inline-flex items-center gap-1" title="Task complexity">
        <Zap className={`w-3 h-3 ${complexityConfig[complexity].color}`} />
        <ComplexityBars complexity={complexity} />
      </span>
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-gray-500" />
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-gray-500">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Export helper functions for use in other components
export { extractTags, estimateComplexity, complexityConfig };
