import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mermaid from 'mermaid';
import { Layers, AlertCircle } from 'lucide-react';
import { generateArchitectureDiagram } from '../../utils/generateArchitectureDiagram';

// Track if mermaid has been initialized
let mermaidInitialized = false;
let diagramId = 0;

/**
 * Initialize mermaid once (lazy initialization)
 */
function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#1e40af',
        lineColor: '#6b7280',
        secondaryColor: '#1f2937',
        tertiaryColor: '#374151',
        subGraphBg: '#1f2937',
        subGraphBorderColor: '#374151'
      },
      flowchart: {
        curve: 'basis',
        padding: 15,
        nodeSpacing: 30,
        rankSpacing: 50,
        useMaxWidth: true
      }
    });
    mermaidInitialized = true;
  }
}

/**
 * System Architecture Diagram component.
 * Renders a Mermaid-based architecture diagram from decision tree data.
 */
function SystemArchitectureDiagram({ decisionTree = [], techStack = [] }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  
  // Generate diagram definition
  const diagramDefinition = useMemo(() => {
    return generateArchitectureDiagram(decisionTree, techStack);
  }, [decisionTree, techStack]);
  
  // Check if we have data to display
  const hasData = diagramDefinition && diagramDefinition.length > 0;
  
  useEffect(() => {
    if (!hasData) {
      setSvgContent('');
      setError(null);
      return;
    }
    
    let isMounted = true;
    
    const renderDiagram = async () => {
      // Initialize mermaid lazily
      initMermaid();
      
      const id = `system-arch-diagram-${++diagramId}`;
      
      try {
        // Validate syntax first (recommended for mermaid 11+)
        await mermaid.parse(diagramDefinition);
        
        // Render the diagram
        const { svg } = await mermaid.render(id, diagramDefinition);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to render diagram');
          setSvgContent('');
        }
      }
    };
    
    renderDiagram();
    
    return () => {
      isMounted = false;
    };
  }, [diagramDefinition, hasData]);
  
  // No data fallback
  if (!hasData) {
    return (
      <section className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">System Architecture</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Layers className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg">No architecture data available</p>
          <p className="text-sm mt-2">Architecture decisions will appear here</p>
        </div>
      </section>
    );
  }
  
  // Error state
  if (error) {
    return (
      <section className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">System Architecture</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-red-400">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="text-lg">Failed to render diagram</p>
          <p className="text-sm mt-2 text-gray-400">{error}</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">System Architecture</h3>
        </div>
        {decisionTree.length > 0 && (
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
            {decisionTree.length} decisions
          </span>
        )}
      </div>
      <div 
        ref={containerRef}
        className="overflow-x-auto min-h-[200px] flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </section>
  );
}

export default SystemArchitectureDiagram;
