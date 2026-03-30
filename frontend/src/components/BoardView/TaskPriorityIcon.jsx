import { AlertCircle, MinusCircle, Circle } from 'lucide-react';

/**
 * Determine priority based on step position or task keywords
 *
 * Priority Rules:
 * - High: First 3 steps OR task contains "critical", "urgent", "important"
 * - Medium: Steps 4-6 OR task contains "should", "needed"
 * - Low: Steps 7+ OR task contains "nice", "later", "optional"
 */
function getPriority(task, stepIndex, totalSteps) {
  const taskLower = (task || '').toLowerCase();

  // Check for high priority keywords
  const highKeywords = ['critical', 'urgent', 'important'];
  if (highKeywords.some(kw => taskLower.includes(kw))) return 'high';

  // Check for medium priority keywords
  const mediumKeywords = ['should', 'needed'];
  if (mediumKeywords.some(kw => taskLower.includes(kw))) return 'medium';

  // Check for low priority keywords
  const lowKeywords = ['nice', 'later', 'optional'];
  if (lowKeywords.some(kw => taskLower.includes(kw))) return 'low';

  // Check for emoji prefix
  if (task.startsWith('🔴')) return 'high';
  if (task.startsWith('🟡')) return 'medium';
  if (task.startsWith('🟢')) return 'low';

  // Infer from step position (1-indexed stepIndex)
  // First 3 steps (index 0-2) = high
  // Steps 4-6 (index 3-5) = medium
  // Steps 7+ (index 6+) = low
  if (stepIndex < 3) return 'high';
  if (stepIndex < 6) return 'medium';
  return 'low';
}

const priorityConfig = {
  high: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'High priority',
  },
  medium: {
    icon: MinusCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Medium priority',
  },
  low: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    label: 'Low priority',
  },
};

export function TaskPriorityIcon({ task, stepIndex = 0, totalSteps = 1, showLabel = false }) {
  const priority = getPriority(task, stepIndex, totalSteps);
  const { icon: Icon, color, bgColor, label } = priorityConfig[priority];

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColor}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-xs ${color}`}>{label}</span>
      </span>
    );
  }

  return <Icon className={`w-4 h-4 ${color} transition-colors duration-200`} title={label} />;
}

// Export priority config and getter for use in other components
export { priorityConfig, getPriority };
