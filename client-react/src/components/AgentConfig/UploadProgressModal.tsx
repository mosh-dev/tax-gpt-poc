import { Modal } from '../common/Modal';
import { type FileUploadProgress } from '../../hooks/useFileUploadQueue';
import { formatBytes, formatSpeed, formatTime } from '../../utils/format';
import { FileText, CheckCircle, XCircle, Loader2, X, Clock } from 'lucide-react';

interface UploadProgressModalProps {
  isOpen: boolean;
  files: FileUploadProgress[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  onClose: () => void;
}

export function UploadProgressModal({
  isOpen,
  files,
  onCancel,
  onCancelAll,
  onClose,
}: UploadProgressModalProps) {
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const hasActiveUploads = files.some((f) => f.status === 'uploading' || f.status === 'processing');

  const getStatusIcon = (file: FileUploadProgress) => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusText = (file: FileUploadProgress) => {
    switch (file.status) {
      case 'queued':
        return 'Queued';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        if (file.processingStage === 'extracting') return 'Extracting text...';
        if (file.processingStage === 'chunking') return 'Chunking document...';
        if (file.processingStage === 'embedding') return 'Generating embeddings...';
        return 'Processing...';
      case 'completed':
        return `Completed (${file.chunkCount || 0} chunks)`;
      case 'error':
        return `Error: ${file.error}`;
      case 'cancelled':
        return 'Cancelled';
    }
  };

  const getProgressPercentage = (file: FileUploadProgress) => {
    if (file.status === 'uploading') {
      return file.uploadProgress;
    }
    if (file.status === 'processing') {
      return file.processingProgress || 0;
    }
    if (file.status === 'completed') {
      return 100;
    }
    return 0;
  };

  return (
    <Modal isOpen={isOpen} onClose={hasActiveUploads ? undefined : onClose} className="w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Uploading Files
          </h2>
          {!hasActiveUploads && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {completedCount} of {files.length} files completed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {files.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Preparing files...</p>
            </div>
          </div>
        ) : (
          files.map((file) => (
          <div
            key={file.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-1">{getStatusIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.file.name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 min-h-[20px]">
                    {formatBytes(file.file.size)} • {getStatusText(file)}
                  </p>
                </div>
              </div>
              <div className="ml-2 w-6 h-6 flex items-center justify-center">
                {(file.status === 'uploading' || file.status === 'processing' || file.status === 'queued') && (
                  <button
                    onClick={() => onCancel(file.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 min-h-[40px]">
              {(file.status === 'uploading' || file.status === 'processing' || file.status === 'completed') && (
                <>
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        file.status === 'completed'
                          ? 'bg-green-600 dark:bg-green-400'
                          : 'bg-blue-600 dark:bg-blue-400'
                      } ${file.uploadProgress > 0 || file.processingProgress ? 'transition-all duration-300' : ''}`}
                      style={{ width: `${getProgressPercentage(file)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 min-h-[16px]">
                    <span>{getProgressPercentage(file)}%</span>
                    <div className="flex items-center gap-3 min-w-[140px] justify-end">
                      {file.status === 'uploading' && file.uploadSpeed > 0 && (
                        <>
                          <span>{formatSpeed(file.uploadSpeed)}</span>
                          <span>ETA: {formatTime(file.eta)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hasActiveUploads ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing files...
            </span>
          ) : (
            <span>All uploads completed</span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveUploads && (
            <button
              onClick={onCancelAll}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              Cancel All
            </button>
          )}
          {!hasActiveUploads && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
