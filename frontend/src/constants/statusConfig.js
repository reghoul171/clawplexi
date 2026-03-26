// Shared status configurations for the PM Dashboard

export const statusIcons = {
  done: 'CheckCircle2',
  in_progress: 'Loader2',
  pending: 'Circle'
};

export const statusColors = {
  done: 'bg-green-500',
  in_progress: 'bg-yellow-500',
  pending: 'bg-gray-600'
};

export const statusLabels = {
  done: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending'
};

// Helper function to get status icon class
export const getStatusIconClass = (status) => {
  const classes = {
    done: 'w-5 h-5 text-green-500',
    in_progress: 'w-5 h-5 text-yellow-500 animate-spin',
    pending: 'w-5 h-5 text-gray-500'
  };
  return classes[status] || classes.pending;
};

// Helper function to get status badge class
export const getStatusBadgeClass = (status) => {
  const classes = {
    done: 'bg-green-500/20 text-green-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    pending: 'bg-gray-600/50 text-gray-400'
  };
  return classes[status] || classes.pending;
};
