import { CheckCircle2, Clock, Circle, GitBranch } from 'lucide-react';

/**
 * Quick stats cards at the bottom of overview.
 */

function QuickStats({ implementationPlan }) {
  const completedSteps = implementationPlan?.filter(s => s.status === 'done').length || 0;
  const inProgressSteps = implementationPlan?.filter(s => s.status === 'in_progress').length || 0;
  const pendingSteps = implementationPlan?.filter(s => s.status === 'pending').length || 0;
  const totalSteps = implementationPlan?.length || 0;

  const stats = [
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      value: completedSteps,
      label: 'Completed',
      color: 'text-green-500',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      value: inProgressSteps,
      label: 'In Progress',
      color: 'text-yellow-500',
    },
    {
      icon: <Circle className="w-6 h-6" />,
      value: pendingSteps,
      label: 'Pending',
      color: 'text-gray-400',
    },
    {
      icon: <GitBranch className="w-6 h-6" />,
      value: totalSteps,
      label: 'Total Steps',
      color: 'text-blue-500',
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-800 rounded-xl p-4 text-center">
          <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}

export default QuickStats;
