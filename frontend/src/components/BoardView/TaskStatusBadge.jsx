const statusStyles = {
  pending: 'bg-gray-600/50 text-gray-300 border-gray-500',
  in_progress: 'bg-yellow-900/50 text-yellow-300 border-yellow-600/50',
  done: 'bg-green-900/50 text-green-300 border-green-600/50'
};

export function TaskStatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${style}`}>
      {status?.replace('_', ' ') || 'pending'}
    </span>
  );
}
