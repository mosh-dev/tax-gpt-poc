import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../../services/api';
import { knowledgeApi, type KnowledgeFile } from '../../services/knowledge-api';

export default function AgentConfig() {
  const [instructions, setInstructions] = useState('');
  const [originalInstructions, setOriginalInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Knowledge Base state
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [loadingKB, setLoadingKB] = useState(false);
  const [uploadingKB, setUploadingKB] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbSuccess, setKbSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  // UI state
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);

  const loadConfig = useCallback(async () => {
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
  }, []);

  const loadKnowledgeFiles = useCallback(async () => {
    try {
      setLoadingKB(true);
      setKbError(null);
      const files = await knowledgeApi.getFiles();
      setKnowledgeFiles(files);
    } catch (err: any) {
      setKbError(err.message || 'Failed to load knowledge base files');
    } finally {
      setLoadingKB(false);
    }
  }, []);

  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadConfig();
    loadKnowledgeFiles();
  }, [loadConfig, loadKnowledgeFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['.txt', '.md', '.pdf'];
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of files) {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!allowedTypes.includes(fileExt)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 50MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setKbError(errors.join(', '));
    } else {
      setKbError(null);
    }

    // Store valid files for confirmation
    setSelectedFiles(validFiles);
  };

  const handleUploadConfirm = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadingKB(true);
      setKbError(null);
      setKbSuccess(null);

      // Upload files one by one
      const results = [];
      for (const file of selectedFiles) {
        try {
          await knowledgeApi.uploadFile(file);
          results.push({ file: file.name, success: true });
        } catch (err: any) {
          results.push({ file: file.name, success: false, error: err.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount === 0) {
        setKbSuccess(`Successfully uploaded ${successCount} file(s)!`);
      } else {
        const failedFiles = results.filter(r => !r.success).map(r => r.file).join(', ');
        setKbError(`${successCount} file(s) uploaded, ${failedCount} failed: ${failedFiles}`);
        if (successCount > 0) {
          setKbSuccess(`${successCount} file(s) uploaded successfully`);
        }
      }

      await loadKnowledgeFiles();

      // Clear selection and file input
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Hide success message after 5 seconds
      setTimeout(() => setKbSuccess(null), 5000);
    } catch (err: any) {
      setKbError(err.message || 'Failed to upload files');
    } finally {
      setUploadingKB(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will remove all associated knowledge base data.`)) {
      return;
    }

    try {
      setKbError(null);
      await knowledgeApi.deleteFile(fileId);
      setKbSuccess(`File "${fileName}" deleted successfully`);
      await loadKnowledgeFiles();
      setTimeout(() => setKbSuccess(null), 3000);
    } catch (err: any) {
      setKbError(err.message || 'Failed to delete file');
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
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
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

          {/* Knowledge Base Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-3 md:px-4 py-3 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-900">Knowledge Base</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Upload documents to enhance the agent's knowledge. Files are automatically processed and indexed for semantic search.
              </p>
            </div>

            {/* KB Status messages */}
            <div className="p-3 md:p-4">
              {kbError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {kbError}
                </div>
              )}
              {kbSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  {kbSuccess}
                </div>
              )}

              {/* Upload Section */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="kb-file-upload"
                  disabled={selectedFiles.length > 0 || uploadingKB}
                />

                {selectedFiles.length === 0 ? (
                  <div>
                    <label
                      htmlFor="kb-file-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Select Files
                    </label>
                    <span className="ml-3 text-sm text-gray-500">
                      Accepts: .txt, .md, .pdf (max 50MB each) • Multiple files allowed
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {selectedFiles.length} file(s) selected
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2 rounded">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-gray-500 flex-shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadConfirm}
                        disabled={uploadingKB}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          uploadingKB
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {uploadingKB ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                      </button>
                      <button
                        onClick={handleCancelUpload}
                        disabled={uploadingKB}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Files List */}
              {loadingKB ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : knowledgeFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No knowledge base files uploaded yet. Upload documents to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {file.downloadUrl ? (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.name}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer truncate block"
                              title="Click to download"
                            >
                              {file.name}
                            </a>
                          ) : (
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {file.type.toUpperCase()} • {(file.size / 1024).toFixed(1)} KB • {file.chunkCount} chunks
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* KB Help text */}
          <div className="mt-4 p-3 md:p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-xs md:text-sm font-medium text-purple-800 mb-2">How Knowledge Base works:</h3>
            <ul className="text-xs md:text-sm text-purple-700 space-y-1 list-disc list-inside">
              <li>Upload tax regulations, guides, or reference documents (.txt, .md, .pdf)</li>
              <li>Files are automatically chunked and indexed using semantic search</li>
              <li>Agent automatically retrieves relevant content for tax-related questions</li>
              <li>Use the "search-knowledge" tool for specific information lookups</li>
              <li>Updates take effect immediately for all conversations</li>
            </ul>
          </div>

          {/* Instructions editor */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-8">
            <button
              onClick={() => setInstructionsExpanded(!instructionsExpanded)}
              className="w-full px-3 md:px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2"
            >
              <label className="text-sm font-medium text-gray-700 cursor-pointer">
                System Instructions
              </label>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {lastUpdated && (
                  <span className="hidden sm:inline text-xs text-gray-500">
                    {new Date(lastUpdated).toLocaleDateString()}
                  </span>
                )}
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${instructionsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {instructionsExpanded && (
              <div className="p-3 md:p-4">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-[300px] md:h-[500px] p-3 md:p-4 font-mono text-xs md:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter the AI agent's system instructions..."
                />
                  <div className="flex flex-col sm:flex-row justify-end pt-2 gap-2 sm:gap-3">
                      {hasChanges && (
                          <button
                              onClick={handleReset}
                              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                              Reset
                          </button>
                      )}
                      <button
                          onClick={handleSave}
                          disabled={saving || !hasChanges}
                          className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              saving || !hasChanges
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                          {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                  </div>
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-xs md:text-sm font-medium text-blue-800 mb-2">Tips for writing good instructions:</h3>
            <ul className="text-xs md:text-sm text-blue-700 space-y-1 list-disc list-inside">
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
