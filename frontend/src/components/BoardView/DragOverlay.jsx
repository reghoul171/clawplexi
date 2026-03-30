import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';

/**
 * Custom drag overlay for step cards
 * Shows a styled preview when dragging
 */
function StepDragOverlay({ activeStep }) {
  if (!activeStep) return null;

  return (
    <DndDragOverlay>
      <div
        className="
        p-3 bg-gray-600 rounded-lg border border-blue-400/50
        shadow-xl rotate-3 scale-105
        pointer-events-none
      "
      >
        <div className="pl-6">
          <span className="text-xs font-mono text-gray-400">Step {activeStep.step}</span>
          <p className="text-sm text-white mt-1">{activeStep.task}</p>
        </div>
      </div>
    </DndDragOverlay>
  );
}

export default StepDragOverlay;
