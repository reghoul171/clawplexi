import { Users, Code, Calendar, Clock, GitBranch, CheckCircle2 } from 'lucide-react';
import { calculatePhase } from '../../utils/calculatePhase';

/**
 * Grid of project statistics.
 */

function StatsGrid({ teamSize, linesOfCode, startDate, progressPercentage, decisionTree }) {
  const phase = calculatePhase(progressPercentage);

  const stats = [
    {
      icon: <Users className="w-5 h-5 text-blue-400" />,
      label: 'Team Size',
      value: teamSize || 1,
    },
    {
      icon: <Code className="w-5 h-5 text-green-400" />,
      label: 'Lines of Code',
      value: linesOfCode?.toLocaleString() || '0',
    },
    {
      icon: <Calendar className="w-5 h-5 text-purple-400" />,
      label: 'Start Date',
      value: startDate ? new Date(startDate).toLocaleDateString() : 'Not set',
    },
    {
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
      label: 'Current Phase',
      value: phase.name,
    },
    {
      icon: <GitBranch className="w-5 h-5 text-cyan-400" />,
      label: 'Decisions',
      value: decisionTree?.length || 0,
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      label: 'Progress',
      value: `${progressPercentage}%`,
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {stat.icon}
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
          <div className="text-xl font-bold text-white">{stat.value}</div>
        </div>
      ))}
    </section>
  );
}

export default StatsGrid;
