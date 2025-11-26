/**
 * useKnowledgeBase Hook
 * Manages knowledge base file operations
 */

import { useState, useCallback, useRef, useEffect, type ChangeEvent, type RefObject } from 'react';
import { knowledgeApi, type KnowledgeFile } from '../../../services/knowledge-api';
import { useFileUploadQueue } from '../../../hooks/useFileUploadQueue';
import { useToast } from '../../../hooks/useToast';
import { KNOWLEDGE_BASE_CONFIG, getMaxFileSizeString } from '../../../constants/knowledge-base';

export interface UseKnowledgeBaseReturn {
  knowledgeFiles: KnowledgeFile[];
  loadingKB: boolean;
  uploadingKB: boolean;
  selectedFiles: File[];
  isProgressModalOpen: boolean;
  uploadQueue: ReturnType<typeof useFileUploadQueue>['files'];
  setSelectedFiles: (files: File[]) => void;
  setIsProgressModalOpen: (open: boolean) => void;
  loadKnowledgeFiles: () => Promise<void>;
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUploadConfirm: () => void;
  handleCancelUpload: () => void;
  handleDeleteFile: (fileId: string, fileName: string) => Promise<void>;
  cancelFile: (fileId: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
}

export function useKnowledgeBase(fileInputRef: RefObject<HTMLInputElement | null>): UseKnowledgeBaseReturn {
  const { showToast } = useToast();
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [loadingKB, setLoadingKB] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadKnowledgeFiles = useCallback(async () => {
    try {
      setLoadingKB(true);
      const files = await knowledgeApi.getFiles();
      setKnowledgeFiles(files);
    } catch (err: any) {
      showToast(err.message || 'Failed to load knowledge base files', 'error');
    } finally {
      setLoadingKB(false);
    }
  }, [showToast]);

  const {
    files: uploadQueue,
    isUploading: uploadingKB,
    addFiles,
    cancelFile,
    cancelAll,
    clearCompleted,
  } = useFileUploadQueue(async () => {
    // Show success message
    showToast('Successfully uploaded files!', 'success');

    // Close modal after a brief delay
    setTimeout(() => {
      setIsProgressModalOpen(false);
      clearCompleted();
      // Files will be reloaded when modal closes
    }, 1500);
  });

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!KNOWLEDGE_BASE_CONFIG.ALLOWED_EXTENSIONS.includes(fileExt as any)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }

      if (file.size > KNOWLEDGE_BASE_CONFIG.MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds ${getMaxFileSizeString()}`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      showToast(errors.join(', '), 'error');
    }

    setSelectedFiles(validFiles);
  }, [showToast]);

  const handleUploadConfirm = useCallback(() => {
    if (selectedFiles.length === 0) return;

    const filesToUpload = [...selectedFiles];

    clearCompleted();

    // Add files to queue first, then open modal - prevents empty state flicker
    addFiles(filesToUpload);

    // Use requestAnimationFrame for smooth UI update
    requestAnimationFrame(() => {
      setIsProgressModalOpen(true);
      // Clear selection AFTER modal opens to prevent glitch
      setTimeout(() => {
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
    });
  }, [selectedFiles, fileInputRef, clearCompleted, addFiles]);

  const handleCancelUpload = useCallback(() => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileInputRef]);

  const handleDeleteFile = useCallback(async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await knowledgeApi.deleteFile(fileId);
      showToast(`File "${fileName}" deleted successfully`, 'success');
      await loadKnowledgeFiles();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete file', 'error');
    }
  }, [showToast, loadKnowledgeFiles]);

  // Load knowledge files on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadKnowledgeFiles();
  }, [loadKnowledgeFiles]);

  return {
    knowledgeFiles,
    loadingKB,
    uploadingKB,
    selectedFiles,
    isProgressModalOpen,
    uploadQueue,
    setSelectedFiles,
    setIsProgressModalOpen,
    loadKnowledgeFiles,
    handleFileSelect,
    handleUploadConfirm,
    handleCancelUpload,
    handleDeleteFile,
    cancelFile,
    cancelAll,
    clearCompleted,
  };
}
