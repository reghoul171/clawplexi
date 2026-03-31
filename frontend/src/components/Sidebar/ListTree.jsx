import { Circle, CheckCircle2, Clock } from 'lucide-react';

// Status icon and color mapping
const statusConfig = {
  done: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-400',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
  },
  pending: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
  },
};

function ListTree({ list, isActive, onClick }) {
  const config = statusConfig[list.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Calculate progress percentage for this list
  const progressPercent =
    list.itemCount > 0 ? Math.round((list.completedCount / list.itemCount) * 100) : 0;

  // Derive test id from list id (e.g., "tests-MyProject" -> "sidebar-tests")
  const testId = list.id ? `sidebar-${list.id.split('-')[0]}` : 'sidebar-item';

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-2 pl-9 pr-3 py-2 text-sm transition-all duration-150 ${
        isActive
          ? 'bg-purple-600 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
      }`}
    >
      {/* Status indicator */}
      <StatusIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : config.color}`} />

      {/* List name */}
      <span className="flex-1 text-left truncate">{list.name}</span>

      {/* Progress indicator */}
      {list.itemCount > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isActive ? 'bg-white/70' : 'bg-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={`text-xs tabular-nums ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
            {list.completedCount}/{list.itemCount}
          </span>
        </div>
      )}
    </button>
  );
}

export default ListTree;
