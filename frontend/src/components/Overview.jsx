import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, ChevronRight, ChevronDown, Clock, FileText, GitBranch, AlertCircle } from 'lucide-react';

function Overview({ project }) {
  const [expandedStep, setExpandedStep] = useState(null);

  const statusIcons = {
    done: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    in_progress: <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />,
    pending: <Circle className="w-5 h-5 text-gray-500" />
  };

  const statusColors = {
    done: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    pending: 'bg-gray-600'
  };

  const statusLabels = {
    done: 'Completed',
    in_progress: 'In Progress',
    pending: 'Pending'
  };

  const completedSteps = project.implementation_plan.filter(s => s.status === 'done').length;
  const totalSteps = project.implementation_plan.length;

  // Get related decisions for a step (based on step number or keywords in task)
  const getRelatedDecisions = (stepItem) => {
    const stepNum = parseInt(stepItem.step);
    // Map steps to likely decision categories
    const stepToDecisionMap = {
      1: ['arch_choice', 'project_setup'],  // Setup
      2: ['auth_choice', 'security'],        // Authentication
      3: ['db_choice', 'database'],          // Database
      4: ['api_choice', 'api'],              // API
      5: ['websocket', 'realtime'],          // WebSocket
      6: ['testing', 'test'],                // Testing
      7: ['deploy_choice', 'deployment']     // Deployment
    };

    const relevantKeys = stepToDecisionMap[stepNum] || [];
    return project.decision_tree.filter(d => 
      relevantKeys.some(key => d.node_id.includes(key) || d.decision.toLowerCase().includes(key))
    );
  };

  // Get related tests for a step
  const getRelatedTests = (stepItem) => {
    const taskWords = stepItem.task.toLowerCase().split(' ');
    return project.tests_generated.filter(t => 
      taskWords.some(word => 
        word.length > 3 && (
          t.test_name.toLowerCase().includes(word) ||
          t.file.toLowerCase().includes(word)
        )
      )
    );
  };

  // Generate step details based on available data
  const getStepDetails = (stepItem) => {
    const details = [];
    
    // Add contextual details based on task type
    if (stepItem.task.toLowerCase().includes('set up') || stepItem.task.toLowerCase().includes('initialize')) {
      details.push({
        icon: <FileText className="w-4 h-4" />,
        label: 'Type',
        value: 'Project Setup'
      });
      details.push({
        icon: <GitBranch className="w-4 h-4" />,
        label: 'Branch',
        value: 'main'
      });
    }
    
    if (stepItem.task.toLowerCase().includes('auth')) {
      details.push({
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Priority',
        value: 'High'
      });
    }

    if (stepItem.task.toLowerCase().includes('api')) {
      details.push({
        icon: <FileText className="w-4 h-4" />,
        label: 'Files to Create',
        value: 'routes/, controllers/, middleware/'
      });
    }

    if (stepItem.task.toLowerCase().includes('test')) {
      details.push({
        icon: <FileText className="w-4 h-4" />,
        label: 'Coverage Target',
        value: '80%'
      });
    }

    if (stepItem.task.toLowerCase().includes('deploy')) {
      details.push({
        icon: <GitBranch className="w-4 h-4" />,
        label: 'Environment',
        value: 'Production'
      });
    }

    // Add timestamp info
    details.push({
      icon: <Clock className="w-4 h-4" />,
      label: 'Status',
      value: statusLabels[stepItem.status]
    });

    return details;
  };

  const toggleStep = (stepIndex) => {
    setExpandedStep(expandedStep === stepIndex ? null : stepIndex);
  };

  return (
    <div className="space-y-8">
      {/* Progress Section */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Progress</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Overall Completion</span>
            <span className="text-white font-medium">{project.progress_percentage}%</span>
          </div>
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
              {project.editor_used}
            </span>
          </div>
        </div>
      </section>

      {/* Implementation Plan */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Implementation Plan</h3>
        <p className="text-sm text-gray-400 mb-4">Click on a step to view more details</p>
        <div className="space-y-3">
          {project.implementation_plan.map((item, index) => {
            const isExpanded = expandedStep === index;
            const relatedDecisions = getRelatedDecisions(item);
            const relatedTests = getRelatedTests(item);
            const stepDetails = getStepDetails(item);

            return (
              <div key={index} className="rounded-lg overflow-hidden">
                {/* Step Header - Clickable */}
                <button
                  onClick={() => toggleStep(index)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-all duration-200 ${
                    item.status === 'done' ? 'bg-gray-700/50 hover:bg-gray-700/70' : 
                    item.status === 'in_progress' ? 'bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-600/30' : 
                    'bg-gray-700/30 hover:bg-gray-700/50'
                  } ${isExpanded ? 'ring-2 ring-blue-500/50' : ''}`}
                >
                  {statusIcons[item.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">Step {item.step}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-600/50 text-gray-400'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      {relatedDecisions.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          {relatedDecisions.length} decision{relatedDecisions.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {relatedTests.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                          {relatedTests.length} test{relatedTests.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 ${item.status === 'done' ? 'text-gray-400 line-through' : 'text-white font-medium'}`}>
                      {item.task}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-gray-900/50 p-4 border-t border-gray-700 animate-slide-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Step Details */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Step Details
                        </h4>
                        <div className="space-y-2">
                          {stepDetails.map((detail, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">{detail.icon}</span>
                              <span className="text-gray-400">{detail.label}:</span>
                              <span className="text-white">{detail.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Progress indicator for in-progress steps */}
                        {item.status === 'in_progress' && (
                          <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Currently working on this step...</span>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-500 animate-pulse"
                                style={{ width: '60%' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Related Decisions */}
                      {relatedDecisions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <GitBranch className="w-4 h-4" />
                            Related Decisions
                          </h4>
                          <div className="space-y-2">
                            {relatedDecisions.map((decision, i) => (
                              <div key={i} className="p-2 bg-purple-900/20 rounded-lg border border-purple-600/20">
                                <div className="text-sm text-purple-400 font-medium">
                                  {decision.decision}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Chosen: <span className="text-white">{decision.chosen}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 italic">
                                  {decision.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related Tests */}
                      {relatedTests.length > 0 && (
                        <div className={relatedDecisions.length > 0 ? 'md:col-span-2' : ''}>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Related Tests
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {relatedTests.map((test, i) => (
                              <div 
                                key={i} 
                                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                  test.status === 'passing' 
                                    ? 'bg-green-900/30 text-green-400 border border-green-600/30' 
                                    : 'bg-red-900/30 text-red-400 border border-red-600/30'
                                }`}
                              >
                                {test.status === 'passing' ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                <span>{test.test_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No related content */}
                      {relatedDecisions.length === 0 && relatedTests.length === 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Additional Info
                          </h4>
                          <p className="text-sm text-gray-500 italic">
                            No related decisions or tests found for this step.
                            Decisions and tests will appear here when they relate to this task.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{completedSteps}</div>
          <div className="text-xs text-gray-400 mt-1">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">
            {project.implementation_plan.filter(s => s.status === 'in_progress').length}
          </div>
          <div className="text-xs text-gray-400 mt-1">In Progress</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {project.implementation_plan.filter(s => s.status === 'pending').length}
          </div>
          <div className="text-xs text-gray-400 mt-1">Pending</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{project.decision_tree.length}</div>
          <div className="text-xs text-gray-400 mt-1">Decisions</div>
        </div>
      </section>
    </div>
  );
}

export default Overview;
