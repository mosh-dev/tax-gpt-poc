import { type ChangeEvent } from 'react';
import { Upload, X, ChevronDown, ChevronUp, FileText, Trash2 } from 'lucide-react';
import { type KnowledgeFile } from '../../services/knowledge-api';

interface KnowledgeBaseSectionProps {
  knowledgeFiles: KnowledgeFile[];
  loadingKB: boolean;
  uploadingKB: boolean;
  selectedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  expanded: boolean;
  onToggleExpand: () => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onUploadConfirm: () => void;
  onCancelUpload: () => void;
  onDeleteFile: (fileId: string, fileName: string) => Promise<void>;
}

export function KnowledgeBaseSection({
  knowledgeFiles,
  loadingKB,
  uploadingKB,
  selectedFiles,
  fileInputRef,
  expanded,
  onToggleExpand,
  onFileSelect,
  onUploadConfirm,
  onCancelUpload,
  onDeleteFile,
}: KnowledgeBaseSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggleExpand}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Knowledge Base
          </h2>
          {knowledgeFiles.length > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded">
              {knowledgeFiles.length} file{knowledgeFiles.length !== 1 ? 's' : ''}
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
          expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 pt-0 space-y-4">
          <div className="border-2 border-dashed mt-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 min-h-[200px] flex flex-col justify-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf"
              onChange={onFileSelect}
              className="hidden"
              id="kb-file-input"
            />

            {selectedFiles.length === 0 ? (
              <label
                htmlFor="kb-file-input"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select files or drag and drop
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Supports .txt, .md, and .pdf (max 50MB each)
                </span>
              </label>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={onCancelUpload}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onUploadConfirm}
                    disabled={uploadingKB}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadingKB ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                  </button>
                  <button
                    onClick={onCancelUpload}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {loadingKB ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
          ) : knowledgeFiles.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uploaded Files
              </h3>
              {knowledgeFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {file.name}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {file.type.toUpperCase()} • {(file.size / 1024).toFixed(0)} KB •{' '}
                      {file.chunkCount} chunks
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteFile(file.id, file.name)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
              No files uploaded yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
