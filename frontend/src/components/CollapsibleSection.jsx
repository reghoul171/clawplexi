import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Reusable collapsible section component.
 * Supports localStorage persistence for expanded state.
 * 
 * @param {string} id - Unique identifier for localStorage persistence
 * @param {string} title - Section title
 * @param {ReactNode} icon - Optional icon to display before title
 * @param {boolean} defaultExpanded - Default expanded state if no localStorage value
 * @param {ReactNode} children - Content to show when expanded
 * @param {string} className - Additional CSS classes
 */
function CollapsibleSection({ 
  id, 
  title, 
  icon, 
  defaultExpanded = false, 
  children, 
  className = '' 
}) {
  // Initialize from localStorage or default
  const [isExpanded, setIsExpanded] = useState(() => {
    if (id) {
      const stored = localStorage.getItem(`collapsible-${id}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultExpanded;
  });

  // Persist to localStorage when changed
  useEffect(() => {
    if (id) {
      localStorage.setItem(`collapsible-${id}`, String(isExpanded));
    }
  }, [id, isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden ${className}`}>
      {/* Header - Clickable */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-blue-400">{icon}</span>}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="text-gray-400 transition-transform duration-200">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Content - Animated */}
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-6 pb-6 border-t border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
