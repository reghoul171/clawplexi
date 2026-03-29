import { useDroppable } from '@dnd-kit/core';
import ColumnHeader from './ColumnHeader';
import StepCard from './StepCard';

/**
 * BoardColumn - Droppable Kanban column
 */
function BoardColumn({
  id,
  title,
  steps,
  icon: Icon,
  iconColor,
  borderColor,
  bgColor,
  activeId,
  totalSteps,
  onEdit,
  onDelete
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      status: id
    }
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${id}`}
      className={`
        flex-1 min-w-[280px] bg-gray-800/50 rounded-xl border overflow-hidden
        transition-all duration-150
        ${isOver ? 'ring-2 ring-violet-400/50 bg-violet-500/5' : ''}
        ${borderColor}
      `}
    >
      {/* Header */}
      <div className={bgColor}>
        <ColumnHeader
          title={title}
          count={steps.length}
          icon={Icon}
          iconColor={iconColor}
        />
      </div>
      
      {/* Cards container */}
      <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-auto">
        {steps.map((step, index) => (
          <StepCard
            key={step.step}
            step={step}
            isDragging={String(step.step) === activeId}
            totalSteps={totalSteps}
            stepIndex={step.step - 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        
        {steps.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No items</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardColumn;
