import { type ChangeEvent } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

interface SystemInstructionsSectionProps {
  instructions: string;
  hasChanges: boolean;
  loading: boolean;
  saving: boolean;
  lastUpdated: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
}

export function SystemInstructionsSection({
  instructions,
  hasChanges,
  loading,
  saving,
  lastUpdated,
  expanded,
  onToggleExpand,
  onSave,
  onChange,
}: SystemInstructionsSectionProps) {

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggleExpand}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            System Instructions
          </h2>
          {hasChanges && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 pt-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
          ) : (
            <>
              <textarea
                value={instructions}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
                className="w-full h-64 p-4 mt-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                placeholder="Enter system instructions for the tax agent..."
                disabled={saving}
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {lastUpdated && (
                    <span>
                      Last updated: {new Date(lastUpdated).toLocaleString()}
                    </span>
                  )}
                </div>

                <button
                  onClick={onSave}
                  disabled={!hasChanges || saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
