/**
 * ColumnHeader - Header for Kanban columns
 * Displays icon, title, and count badge
 */
function ColumnHeader({ title, count, icon: Icon, iconColor }) {
  return (
    <div className="px-4 py-3 border-b border-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{count}</span>
      </div>
    </div>
  );
}

export default ColumnHeader;
