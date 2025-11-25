/**
 * File Upload Utilities
 * Handles file uploads for workflow steps
 */

import { apiService } from '../../services/api';
import type { TaxDocument } from '../../types/common.types';

/**
 * Upload files for workflow and convert to TaxDocument format
 */
export const uploadWorkflowFiles = async (
  files: File[],
  threadId: string
): Promise<TaxDocument[]> => {
  const uploadedFiles = await apiService.uploadFiles(files, threadId);

  return uploadedFiles.map(f => ({
    fileId: f.fileId,
    fileName: f.originalName,
    fileType: f.mimeType,
  }));
};
