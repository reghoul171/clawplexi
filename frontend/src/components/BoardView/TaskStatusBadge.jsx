import { Clock, Play, CheckCircle } from 'lucide-react';

const statusConfig = {
  pending: {
    styles: 'bg-gray-600/50 text-gray-300 border-gray-500',
    icon: Clock,
    label: 'Pending',
  },
  in_progress: {
    styles: 'bg-yellow-900/50 text-yellow-300 border-yellow-600/50',
    icon: Play,
    label: 'In Progress',
  },
  done: {
    styles: 'bg-green-900/50 text-green-300 border-green-600/50',
    icon: CheckCircle,
    label: 'Done',
  },
};

const sizeStyles = {
  sm: 'text-xs px-1.5 py-0.5 rounded',
  md: 'text-xs px-2 py-0.5 rounded border',
};

export function TaskStatusBadge({ status, size = 'md', showIcon = true }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const sizeStyle = sizeStyles[size];

  return (
    <span
      className={`${sizeStyle} ${config.styles} inline-flex items-center gap-1 transition-all duration-200`}
      title={config.label}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span className="capitalize">{status?.replace('_', ' ') || 'pending'}</span>
    </span>
  );
}

// Export status config for use in other components
export { statusConfig };
