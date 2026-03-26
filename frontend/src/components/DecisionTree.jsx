import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitBranch, AlertCircle } from 'lucide-react';

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#2563eb',
    lineColor: '#6b7280',
    secondaryColor: '#1f2937',
    tertiaryColor: '#1f2937'
  },
  flowchart: {
    curve: 'basis',
    padding: 20
  }
});

function convertToMermaid(decisionTree) {
  if (!decisionTree || decisionTree.length === 0) {
    return null;
  }

  let mermaidStr = 'flowchart TD\n';
  mermaidStr += '  Start[Project Start] --> A\n\n';

  decisionTree.forEach((item, index) => {
    const nodeId = String.fromCharCode(65 + index); // A, B, C, ...
    const nextNodeId = String.fromCharCode(66 + index); // B, C, D, ...

    // Add decision node
    mermaidStr += `  ${nodeId}[${item.decision}]\n`;
    mermaidStr += `  ${nodeId} --> ${nodeId}choice\n`;
    mermaidStr += `  ${nodeId}choice{${item.chosen}}\n`;
    
    // Link to next node or end
    if (index < decisionTree.length - 1) {
      mermaidStr += `  ${nodeId}choice --> ${nextNodeId}\n`;
    } else {
      mermaidStr += `  ${nodeId}choice --> End[Project Complete]\n`;
    }

    // Add reason as a sub-node
    mermaidStr += `  ${nodeId}choice -.-> ${nodeId}reason[${item.reason}]\n\n`;
  });

  return mermaidStr;
}

function DecisionTree({ project }) {
  const mermaidRef = useRef(null);
  const [renderError, setRenderError] = useState(false);
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!project.decision_tree || project.decision_tree.length === 0) {
        setSvgContent('');
        return;
      }

      try {
        const mermaidStr = convertToMermaid(project.decision_tree);
        if (!mermaidStr) {
          setSvgContent('');
          return;
        }

        const { svg } = await mermaid.render('decision-tree-svg', mermaidStr);
        setSvgContent(svg);
        setRenderError(false);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setRenderError(true);
      }
    };

    renderDiagram();
  }, [project.decision_tree]);

  if (!project.decision_tree || project.decision_tree.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Decision Tree</h3>
        </div>
        <p className="text-gray-400">No decisions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Decision Tree</h3>
        </div>

        {renderError ? (
          <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to render decision tree diagram</span>
          </div>
        ) : (
          <div 
            ref={mermaidRef}
            className="overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Decision Details Table */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Decision Details</h3>
        <div className="space-y-4">
          {project.decision_tree.map((item, index) => (
            <div key={item.node_id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-500">{item.node_id}</span>
                    <span className="text-sm font-medium text-white">{item.decision}</span>
                  </div>
                  <div className="text-blue-400 font-medium mb-1">
                    Chosen: {item.chosen}
                  </div>
                  <div className="text-sm text-gray-400">
                    Reason: {item.reason}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DecisionTree;
