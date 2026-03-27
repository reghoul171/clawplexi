import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderKanban, Code2, FlaskConical, Lightbulb, FileText, Rocket, Palette } from 'lucide-react';
import ListTree from './ListTree';

// Icon mapping for space types
const spaceIcons = {
  FolderKanban: FolderKanban,
  Code2: Code2,
  FlaskConical: FlaskConical,
  Lightbulb: Lightbulb,
  FileText: FileText,
  Rocket: Rocket,
  Palette: Palette
};

function SpaceSection({ 
  space, 
  isExpanded, 
  onToggle, 
  activeListId, 
  onSelectList 
}) {
  const IconComponent = spaceIcons[space.icon] || FolderKanban;
  
  // Calculate total items and completed
  const totalItems = space.lists.reduce((sum, list) => sum + list.itemCount, 0);
  const completedItems = space.lists.reduce((sum, list) => sum + list.completedCount, 0);
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  return (
    <div className="border-b border-gray-700/50">
      {/* Space header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/50 transition-colors group"
      >
        {/* Expand/collapse chevron */}
        <div className="w-4 h-4 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-300" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-300" />
          )}
        </div>
        
        {/* Space icon */}
        <IconComponent className={`w-4 h-4 ${space.color}`} />
        
        {/* Space name and count */}
        <span className="flex-1 text-left text-sm font-medium text-gray-200 group-hover:text-white truncate">
          {space.name}
        </span>
        
        {/* Item count badge */}
        <span className="text-xs text-gray-500 bg-gray-700/70 px-1.5 py-0.5 rounded">
          {space.lists.length}
        </span>
      </button>
      
      {/* Lists (collapsible) */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pb-1">
          {space.lists.map(list => (
            <ListTree
              key={list.id}
              list={list}
              isActive={activeListId === list.id}
              onClick={() => onSelectList(list)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SpaceSection;
