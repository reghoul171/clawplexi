import { useState, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { Kanban, Circle, Loader2, CheckCircle2 } from 'lucide-react';

import BoardColumn from './BoardColumn';
import { useStepDrag } from './hooks/useStepDrag';
import { useStepEditor } from './hooks/useStepEditor';
import StepDragOverlay from './DragOverlay';
import { TaskCardEditor } from './TaskCardEditor';

/**
 * BoardView - Interactive Kanban board with drag & drop
 */
function BoardView({ project }) {
  const [activeId, setActiveId] = useState(null);

  const { steps, handleDragEnd, handleStatusChange, isUpdating, error, clearError } =
    useStepDrag(project);

  // Step editor hook
  const {
    editingStep,
    editForm,
    setEditForm,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving,
    error: editError,
  } = useStepEditor(project);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group steps by status
  const columns = useMemo(() => {
    const pending = steps.filter(s => s.status === 'pending' || !s.status);
    const inProgress = steps.filter(s => s.status === 'in_progress');
    const done = steps.filter(s => s.status === 'done');

    return { pending, inProgress, done };
  }, [steps]);

  // Get active step for drag overlay
  const activeStep = useMemo(() => {
    if (!activeId) return null;
    return steps.find(s => String(s.step) === activeId);
  }, [activeId, steps]);

  // Get editing step data
  const editingStepData = useMemo(() => {
    if (!editingStep) return null;
    return steps.find(s => String(s.step) === String(editingStep));
  }, [editingStep, steps]);

  // Handle drag start
  const handleDragStart = event => {
    setActiveId(String(event.active.id));
  };

  // Handle drag end
  const onDragEnd = event => {
    setActiveId(null);
    handleDragEnd(event);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Handle delete step
  const handleDelete = step => {
    // For now, just log - delete functionality can be added later
    console.log('Delete step:', step);
    // TODO: Implement delete with confirmation modal
  };

  if (!project) {
    return <div className="text-center text-gray-400 py-12">No project selected</div>;
  }

  return (
    <div className="space-y-6" data-testid="board-view">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/30 to-blue-900/30 rounded-xl p-6 border border-violet-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-500/20 rounded-xl">
            <Kanban className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Board View</h2>
            <p className="text-violet-300 text-sm mt-1">
              Drag cards between columns to update status
            </p>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Pending Column */}
          <BoardColumn
            id="pending"
            title="Pending"
            steps={columns.pending}
            icon={Circle}
            iconColor="text-gray-400"
            borderColor="border-gray-600"
            bgColor="bg-gray-700/30"
            activeId={activeId}
            totalSteps={steps.length}
            onEdit={startEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />

          {/* In Progress Column */}
          <BoardColumn
            id="in_progress"
            title="In Progress"
            steps={columns.inProgress}
            icon={Loader2}
            iconColor="text-yellow-400"
            borderColor="border-yellow-600/50"
            bgColor="bg-yellow-900/20"
            activeId={activeId}
            totalSteps={steps.length}
            onEdit={startEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />

          {/* Done Column */}
          <BoardColumn
            id="done"
            title="Completed"
            steps={columns.done}
            icon={CheckCircle2}
            iconColor="text-green-400"
            borderColor="border-green-600/50"
            bgColor="bg-green-900/20"
            activeId={activeId}
            totalSteps={steps.length}
            onEdit={startEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Drag Overlay */}
        <StepDragOverlay activeStep={activeStep} />
      </DndContext>

      {/* Loading indicator */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-violet-900/80 text-violet-300 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Updating...</span>
        </div>
      )}

      {/* Edit Modal */}
      {editingStepData && (
        <TaskCardEditor
          step={editingStepData}
          form={editForm}
          onChange={setEditForm}
          onSave={saveEdit}
          onCancel={cancelEdit}
          isSaving={isSaving}
          error={editError}
        />
      )}
    </div>
  );
}

export default BoardView;
