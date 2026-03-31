import { X, Check, Loader2, FileText, Flag } from 'lucide-react';
import { statusConfig } from './TaskStatusBadge';

/**
 * TaskCardEditor - Modal for editing task details
 *
 * @param {Object} step - The step being edited
 * @param {Object} form - Form state { task, status, notes }
 * @param {Function} onChange - Called when form values change
 * @param {Function} onSave - Called when save button is clicked
 * @param {Function} onCancel - Called when cancel/close is clicked
 * @param {boolean} isSaving - Shows loading state when true
 * @param {string} error - Error message to display
 */
export function TaskCardEditor({ step, form, onChange, onSave, onCancel, isSaving, error }) {
  const handleKeyDown = e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Edit Step {step.step}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Task Name</label>
            <input
              type="text"
              value={form.task}
              onChange={e => onChange({ ...form, task: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5 text-white 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         placeholder-gray-500 transition-all duration-200"
              placeholder="Enter task name..."
              autoFocus
              disabled={isSaving}
            />
          </div>

          {/* Status dropdown */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Status
            </label>
            <select
              value={form.status}
              onChange={e => onChange({ ...form, status: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5 text-white 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         transition-all duration-200 cursor-pointer"
              disabled={isSaving}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Notes/Description field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">
              Notes <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes || ''}
              onChange={e => onChange({ ...form, notes: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5 text-white 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         placeholder-gray-500 resize-none transition-all duration-200"
              placeholder="Add notes or description..."
              rows={3}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to save</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 
                       rounded-lg transition-all duration-200"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                       flex items-center gap-2 transition-all duration-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
            disabled={isSaving || !form.task.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
