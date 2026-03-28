import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityIcon } from './TaskPriorityIcon';

/**
 * StepCard - Draggable card for implementation steps
 */
function StepCard({ step, isDragging, totalSteps, stepIndex, onEdit, onDelete }) {
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
      className={`
        group relative p-3 bg-gray-700/50 rounded-lg border border-gray-600/50
        hover:border-gray-500 transition-all duration-200
        ${isDragging ? 'ring-2 ring-blue-400/50 shadow-lg' : ''}
      `}
    >
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
      <div className="pl-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">
              Step {step.step}
            </span>
            <TaskPriorityIcon 
              task={step.task} 
              stepIndex={stepIndex} 
              totalSteps={totalSteps} 
            />
          </div>
          
          {/* Hover actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        
        <p className="text-sm text-white">{step.task}</p>
        
        {/* Status badge */}
        <div className="mt-2">
          <TaskStatusBadge status={step.status} />
        </div>
      </div>
    </div>
  );
}

export default StepCard;
