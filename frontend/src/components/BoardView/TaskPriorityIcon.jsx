import { AlertCircle, MinusCircle, Circle } from 'lucide-react';

// Parse priority from task name (🔴 🟡 🟢) or infer from step position
function getPriority(task, stepIndex, totalSteps) {
  // Check for emoji prefix
  if (task.startsWith('🔴') || task.toLowerCase().includes('critical')) return 'high';
  if (task.startsWith('🟡') || task.toLowerCase().includes('important')) return 'medium';
  if (task.startsWith('🟢')) return 'low';
  
  // Infer from position: first 30% = high, last 30% = low
  if (totalSteps <= 1) return 'medium';
  const position = stepIndex / totalSteps;
  if (position < 0.3) return 'high';
  if (position > 0.7) return 'low';
  return 'medium';
}

export function TaskPriorityIcon({ task, stepIndex, totalSteps }) {
  const priority = getPriority(task, stepIndex, totalSteps);
  
  const config = {
    high: { icon: AlertCircle, color: 'text-red-400', label: 'High priority' },
    medium: { icon: MinusCircle, color: 'text-yellow-400', label: 'Medium priority' },
    low: { icon: Circle, color: 'text-green-400', label: 'Low priority' }
  };
  
  const { icon: Icon, color, label } = config[priority];
  return <Icon className={`w-4 h-4 ${color}`} title={label} />;
}
