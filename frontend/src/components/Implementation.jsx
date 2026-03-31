import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  Download,
  Copy,
  Check,
  Share2,
  X,
} from 'lucide-react';
import { statusLabels } from '../constants/statusConfig';

function Implementation({ project }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const statusIcons = {
    done: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    in_progress: <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />,
    pending: <Circle className="w-5 h-5 text-gray-500" />,
  };

  // Group steps by status
  const completedSteps = project.implementation_plan.filter(s => s.status === 'done');
  const inProgressSteps = project.implementation_plan.filter(s => s.status === 'in_progress');
  const pendingSteps = project.implementation_plan.filter(s => s.status === 'pending');

  // Calculate progress
  const totalSteps = project.implementation_plan.length;
  const completedCount = completedSteps.length;

  // Generate markdown content
  const generateMarkdown = () => {
    const date = new Date().toISOString().split('T')[0];

    let markdown = `# Implementation Plan: ${project.project_name}\n\n`;
    markdown += `**Progress:** ${project.progress_percentage}% Complete\n`;
    markdown += `**Editor:** ${project.editor_used}\n`;
    markdown += `**Generated:** ${date}\n\n`;

    markdown += `## Implementation Steps\n\n`;

    // Completed section
    if (completedSteps.length > 0) {
      markdown += `### ✅ Completed\n`;
      completedSteps.forEach(step => {
        markdown += `- [x] ${step.step}. ${step.task}\n`;
      });
      markdown += `\n`;
    }

    // In Progress section
    if (inProgressSteps.length > 0) {
      markdown += `### 🔄 In Progress\n`;
      inProgressSteps.forEach(step => {
        markdown += `- [ ] ${step.step}. ${step.task} *(in progress)*\n`;
      });
      markdown += `\n`;
    }

    // Pending section
    if (pendingSteps.length > 0) {
      markdown += `### ⏳ Pending\n`;
      pendingSteps.forEach(step => {
        markdown += `- [ ] ${step.step}. ${step.task}\n`;
      });
      markdown += `\n`;
    }

    // Decision Tree section
    if (project.decision_tree && project.decision_tree.length > 0) {
      markdown += `## Decision Tree\n`;
      project.decision_tree.forEach(decision => {
        markdown += `- **${decision.node_id}:** ${decision.decision} → ${decision.chosen}\n`;
      });
      markdown += `\n`;
    }

    // Test Summary section
    if (project.tests_generated && project.tests_generated.length > 0) {
      const passing = project.tests_generated.filter(t => t.status === 'passing').length;
      const failing = project.tests_generated.filter(t => t.status === 'failing').length;
      const total = project.tests_generated.length;
      markdown += `## Test Summary\n`;
      markdown += `- Total: ${total} | Passing: ${passing} | Failing: ${failing}\n`;
    }

    return markdown;
  };

  const handleCopyToClipboard = async () => {
    const markdown = generateMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name.replace(/\s+/g, '-').toLowerCase()}-implementation-plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Step Card Component
  const StepCard = ({ step, index }) => (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
        step.status === 'done'
          ? 'bg-gray-700/50'
          : step.status === 'in_progress'
            ? 'bg-yellow-900/20 border border-yellow-600/30'
            : 'bg-gray-700/30'
      }`}
    >
      {statusIcons[step.status]}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono">Step {step.step}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              step.status === 'done'
                ? 'bg-green-500/20 text-green-400'
                : step.status === 'in_progress'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-600/50 text-gray-400'
            }`}
          >
            {statusLabels[step.status]}
          </span>
        </div>
        <p
          className={`mt-1 ${step.status === 'done' ? 'text-gray-400 line-through' : 'text-white font-medium'}`}
        >
          {step.task}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Implementation Plan</h2>
          <p className="text-sm text-gray-400 mt-1">
            {completedCount} of {totalSteps} steps completed ({project.progress_percentage}%)
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share as Markdown
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${project.progress_percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span>Progress</span>
          <span>{project.progress_percentage}%</span>
        </div>
      </div>

      {/* Completed Steps */}
      {completedSteps.length > 0 && (
        <section className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Completed
            <span className="text-sm font-normal text-gray-400">({completedSteps.length})</span>
          </h3>
          <div className="space-y-3">
            {completedSteps.map((step, index) => (
              <StepCard key={index} step={step} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* In Progress Steps */}
      {inProgressSteps.length > 0 && (
        <section className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
            In Progress
            <span className="text-sm font-normal text-gray-400">({inProgressSteps.length})</span>
          </h3>
          <div className="space-y-3">
            {inProgressSteps.map((step, index) => (
              <StepCard key={index} step={step} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Pending Steps */}
      {pendingSteps.length > 0 && (
        <section className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Circle className="w-5 h-5 text-gray-500" />
            Pending
            <span className="text-sm font-normal text-gray-400">({pendingSteps.length})</span>
          </h3>
          <div className="space-y-3">
            {pendingSteps.map((step, index) => (
              <StepCard key={index} step={step} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{completedSteps.length}</div>
          <div className="text-xs text-gray-400 mt-1">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{inProgressSteps.length}</div>
          <div className="text-xs text-gray-400 mt-1">In Progress</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{pendingSteps.length}</div>
          <div className="text-xs text-gray-400 mt-1">Pending</div>
        </div>
      </section>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gray-700 px-6 py-4 flex items-center justify-between border-b border-gray-600">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Export as Markdown</h2>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Preview */}
            <div className="p-6 overflow-auto max-h-[50vh]">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-gray-900 rounded-lg p-4">
                {generateMarkdown()}
              </pre>
            </div>

            {/* Footer */}
            <div className="bg-gray-700 px-6 py-4 flex justify-end gap-3 border-t border-gray-600">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyToClipboard}
                className={`flex items-center gap-2 px-4 py-2 ${
                  copySuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-lg transition-colors`}
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .md File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Implementation;
