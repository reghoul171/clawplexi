import { Building2, ChevronDown, ChevronRight, Settings, FolderKanban } from 'lucide-react';

function WorkspaceHeader({
  workspaceName,
  isCollapsed,
  onToggle,
  projectCount,
  activeCount,
  completedCount,
}) {
  return (
    <div className="border-b border-gray-700">
      {/* Main header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 hover:bg-gray-700/50 transition-colors"
      >
        <div className="p-1.5 bg-purple-500/20 rounded-lg">
          <Building2 className="w-5 h-5 text-purple-400" />
        </div>

        <div className="flex-1 text-left">
          <h2 className="text-sm font-semibold text-white">{workspaceName}</h2>
          <p className="text-xs text-gray-400">
            {activeCount} active · {completedCount} done
          </p>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
            {projectCount}
          </span>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded stats */}
      {!isCollapsed && (
        <div className="px-3 pb-3 flex gap-2">
          <div className="flex-1 bg-gray-700/50 rounded-lg px-2 py-1.5 text-center">
            <p className="text-lg font-semibold text-white">{activeCount}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="flex-1 bg-gray-700/50 rounded-lg px-2 py-1.5 text-center">
            <p className="text-lg font-semibold text-green-400">{completedCount}</p>
            <p className="text-xs text-gray-400">Done</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceHeader;
