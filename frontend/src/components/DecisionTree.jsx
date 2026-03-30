import { useState } from 'react';
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Lightbulb,
  ArrowRight,
  CircleDot,
  Sparkles,
} from 'lucide-react';

function DecisionTree({ project }) {
  const [expandedDecision, setExpandedDecision] = useState(null);

  if (!project.decision_tree || project.decision_tree.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Decision Tree</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <GitBranch className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg">No decisions recorded yet</p>
          <p className="text-sm mt-2">Decisions will appear here as they are made</p>
        </div>
      </div>
    );
  }

  const toggleDecision = index => {
    setExpandedDecision(expandedDecision === index ? null : index);
  };

  // Generate a timestamp-like sequence for display
  const getDecisionSequence = (index, total) => {
    return `Decision ${index + 1} of ${total}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Decision Timeline</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{project.decision_tree.length} decisions</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Click on any decision to expand and view detailed reasoning
        </p>
      </div>

      {/* Timeline Section */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-gray-600" />

          {/* Decision Items */}
          <div className="space-y-4">
            {project.decision_tree.map((item, index) => {
              const isExpanded = expandedDecision === index;

              return (
                <div key={item.node_id || index} className="relative pl-12">
                  {/* Timeline Node */}
                  <div className="absolute left-2 w-5 h-5 rounded-full border-2 border-gray-800 flex items-center justify-center bg-blue-500">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>

                  {/* Decision Card */}
                  <div
                    className={`rounded-xl overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    {/* Header - Clickable */}
                    <button
                      onClick={() => toggleDecision(index)}
                      className="w-full text-left p-4 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Sequence */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs font-mono text-gray-500">
                              {getDecisionSequence(index, project.decision_tree.length)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                              {item.node_id}
                            </span>
                          </div>

                          {/* Decision Title */}
                          <h4 className="text-white font-medium mb-1">{item.decision}</h4>

                          {/* What was chosen */}
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-blue-400 font-medium truncate">
                              {item.chosen}
                            </span>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className="flex items-center text-gray-400 flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="w-5 h-5 transition-transform duration-200" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 animate-slide-in">
                        <div className="border-t border-gray-700 pt-4 mt-0">
                          {/* Reason Section */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                              <Lightbulb className="w-4 h-4 text-yellow-400" />
                              Reasoning
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed pl-6">
                              {item.reason || 'Not specified'}
                            </p>
                          </div>

                          {/* Alternatives Considered (if available in data) */}
                          {item.alternatives && item.alternatives.length > 0 ? (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                <CircleDot className="w-4 h-4 text-purple-400" />
                                Alternatives Considered
                              </div>
                              <div className="pl-6 space-y-2">
                                {item.alternatives.map((alt, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                    <span className="text-gray-400">{alt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Impact/Scope (if available) */}
                          {item.impact ? (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                Impact & Scope
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed pl-6">
                                {item.impact}
                              </p>
                            </div>
                          ) : null}

                          {/* Context (if available) */}
                          {item.context ? (
                            <div>
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                <Clock className="w-4 h-4 text-cyan-400" />
                                Additional Context
                              </div>
                              <p className="text-gray-400 text-sm leading-relaxed pl-6 italic">
                                {item.context}
                              </p>
                            </div>
                          ) : null}

                          {/* Summary Card */}
                          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-gray-500">Decision:</span>
                                  <span className="ml-2 text-white font-medium">
                                    {item.decision}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-green-400">Finalized</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connecting line to next item */}
                  {index < project.decision_tree.length - 1 && (
                    <div className="absolute left-4 top-full w-0.5 h-4 bg-gradient-to-b from-gray-600 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Timeline End Marker */}
          <div className="relative pl-12 mt-6">
            <div className="absolute left-2 w-5 h-5 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
            </div>
            <div className="text-sm text-gray-500 py-2">Project Start</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{project.decision_tree.length}</div>
              <div className="text-xs text-gray-400">Total Decisions</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <GitBranch className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{project.project_name}</div>
              <div className="text-xs text-gray-400">Project</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{project.editor_used}</div>
              <div className="text-xs text-gray-400">Editor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionTree;
