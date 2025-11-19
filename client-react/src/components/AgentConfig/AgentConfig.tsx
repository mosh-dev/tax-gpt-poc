import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

export default function AgentConfig() {
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState('');
  const [originalInstructions, setOriginalInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await apiService.getAgentConfig();
      setInstructions(config.instructions);
      setOriginalInstructions(config.instructions);
      setLastUpdated(config.updatedAt);
    } catch (err: any) {
      setError(err.message || 'Failed to load agent configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const config = await apiService.updateAgentConfig(instructions);
      setOriginalInstructions(config.instructions);
      setLastUpdated(config.updatedAt);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save agent configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setInstructions(originalInstructions);
  };

  const hasChanges = instructions !== originalInstructions;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Agent Configuration</h1>
              <p className="text-sm text-gray-500">
                Configure the AI agent's system instructions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                saving || !hasChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Status messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              Configuration saved successfully! Note: Changes will take effect for new conversations.
            </div>
          )}

          {/* Instructions editor */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                System Instructions
              </label>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </span>
              )}
            </div>
            <div className="p-4">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full h-[500px] p-4 font-mono text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter the AI agent's system instructions..."
              />
            </div>
          </div>

          {/* Help text */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Tips for writing good instructions:</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Define the agent's role and expertise clearly</li>
              <li>List the tools available and when to use them</li>
              <li>Specify the language and tone to use</li>
              <li>Include domain-specific knowledge (e.g., Swiss tax regulations)</li>
              <li>Add guidelines for handling edge cases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
