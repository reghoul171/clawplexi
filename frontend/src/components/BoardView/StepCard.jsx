import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ChevronDown, Clock, Play, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityIcon } from './TaskPriorityIcon';
import { TaskMetadata } from './TaskMetadata';

/**
 * QuickStatusDropdown - Dropdown for quick status change
 */
function QuickStatusDropdown({ currentStatus, onStatusChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const statusOptions = [
    { value: 'pending', icon: Clock, label: 'Pending', color: 'text-gray-300' },
    { value: 'in_progress', icon: Play, label: 'In Progress', color: 'text-yellow-300' },
    { value: 'done', icon: CheckCircle, label: 'Done', color: 'text-green-300' }
  ];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleSelect = (status) => {
    onStatusChange(status);
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className="p-1 text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-0.5 disabled:opacity-50"
        title="Change status"
      >
        <span className="text-xs">Status</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px] z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {statusOptions.map(({ value, icon: Icon, label, color }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-700/50 transition-colors ${
                value === currentStatus ? 'bg-gray-700/30' : ''
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className={color}>{label}</span>
              {value === currentStatus && (
                <span className="ml-auto text-gray-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ProgressBar - Small progress indicator showing step position in project
 */
function ProgressBar({ stepIndex, totalSteps, status }) {
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  
  return (
    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ease-out ${
          status === 'done' 
            ? 'bg-green-500' 
            : status === 'in_progress' 
              ? 'bg-yellow-500' 
              : 'bg-gray-500'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * StepCard - Draggable card for implementation steps
 */
function StepCard({ 
  step, 
  isDragging, 
  totalSteps, 
  stepIndex, 
  onEdit, 
  onDelete, 
  onStatusChange 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({
    id: String(step.step),
    data: {
      step,
      status: step.status
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`step-card-${step.step}`}
      className={`
        group relative p-3 bg-gray-700/50 rounded-lg border border-gray-600/50
        hover:border-gray-500 hover:bg-gray-700/70
        transition-all duration-200 ease-out
        ${isDragging ? 'ring-2 ring-blue-400/50 shadow-lg scale-[1.02]' : ''}
      `}
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0">
        <ProgressBar stepIndex={stepIndex} totalSteps={totalSteps} status={step.status} />
      </div>
      
      {/* Drag handle */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 
                   opacity-0 group-hover:opacity-100
                   cursor-grab active:cursor-grabbing p-1 
                   text-gray-500 hover:text-gray-300
                   transition-opacity duration-150"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Card content */}
      <div className="pl-6 pt-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TaskPriorityIcon 
              task={step.task} 
              stepIndex={stepIndex} 
              totalSteps={totalSteps} 
            />
          </div>
          
          {/* Hover actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onStatusChange && (
              <QuickStatusDropdown 
                currentStatus={step.status}
                onStatusChange={(status) => onStatusChange(step, status)}
                disabled={isDragging}
              />
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(step);
                }}
                className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                title="Edit step"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(step);
                }}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                title="Delete step"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <p className="text-sm text-white leading-snug">{step.task}</p>
        
        {/* Metadata */}
        <TaskMetadata 
          step={step} 
          stepIndex={stepIndex} 
          totalSteps={totalSteps} 
        />
        
        {/* Status badge */}
        <div className="mt-2">
          <TaskStatusBadge status={step.status} size="sm" />
        </div>
      </div>
    </div>
  );
}

export default StepCard;
