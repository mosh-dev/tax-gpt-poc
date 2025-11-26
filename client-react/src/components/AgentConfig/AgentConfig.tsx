import { useRef, useState } from 'react';
import { UploadProgressModal } from './UploadProgressModal';
import { SystemInstructionsSection } from './SystemInstructionsSection';
import { KnowledgeBaseSection } from './KnowledgeBaseSection';
import { useAgentConfig, useKnowledgeBase } from './hooks';

export default function AgentConfig() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [kbExpanded, setKbExpanded] = useState(true);

  // Agent config management
  const {
    instructions,
    loading,
    saving,
    lastUpdated,
    hasChanges,
    setInstructions,
    saveConfig,
  } = useAgentConfig();

  // Knowledge base management
  const {
    knowledgeFiles,
    loadingKB,
    uploadingKB,
    selectedFiles,
    isProgressModalOpen,
    uploadQueue,
    setIsProgressModalOpen,
    loadKnowledgeFiles,
    handleFileSelect,
    handleUploadConfirm,
    handleCancelUpload,
    handleDeleteFile,
    cancelFile,
    cancelAll,
    clearCompleted,
  } = useKnowledgeBase(fileInputRef);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Configuration</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure the tax agent's behavior and knowledge base
          </p>
        </div>

        <div className="space-y-6">
          <SystemInstructionsSection
            instructions={instructions}
            hasChanges={hasChanges}
            loading={loading}
            saving={saving}
            lastUpdated={lastUpdated}
            expanded={instructionsExpanded}
            onToggleExpand={() => setInstructionsExpanded(!instructionsExpanded)}
            onSave={saveConfig}
            onChange={setInstructions}
          />

          <KnowledgeBaseSection
            knowledgeFiles={knowledgeFiles}
            loadingKB={loadingKB}
            uploadingKB={uploadingKB}
            selectedFiles={selectedFiles}
            fileInputRef={fileInputRef}
            expanded={kbExpanded}
            onToggleExpand={() => setKbExpanded(!kbExpanded)}
            onFileSelect={handleFileSelect}
            onUploadConfirm={handleUploadConfirm}
            onCancelUpload={handleCancelUpload}
            onDeleteFile={handleDeleteFile}
          />
        </div>

        <UploadProgressModal
          isOpen={isProgressModalOpen}
          files={uploadQueue}
          onCancel={cancelFile}
          onCancelAll={cancelAll}
          onClose={async () => {
            setIsProgressModalOpen(false);
            clearCompleted();
            // Reload files to show newly uploaded items
            await loadKnowledgeFiles();
          }}
        />
      </div>
    </div>
  );
}
