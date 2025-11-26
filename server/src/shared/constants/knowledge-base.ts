/**
 * Knowledge Base Configuration Constants
 * Centralized configuration for knowledge base file handling
 */

export const KNOWLEDGE_BASE_CONFIG = {
  /**
   * Allowed file extensions for knowledge base uploads
   */
  ALLOWED_EXTENSIONS: ['.txt', '.md', '.pdf'] as const,

  /**
   * Allowed MIME types for knowledge base uploads
   */
  ALLOWED_MIMES: ['text/plain', 'text/markdown', 'application/pdf'] as const,

  /**
   * Maximum file size for knowledge base uploads (50MB)
   */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /**
   * Maximum number of files per upload request
   */
  MAX_FILES_PER_UPLOAD: 10,

  /**
   * File type regex pattern for validation
   */
  FILE_TYPE_PATTERN: /txt|md|pdf/,

  /**
   * Upload progress stages
   */
  PROGRESS_STAGES: {
    EXTRACTING: 'extracting',
    CHUNKING: 'chunking',
    EMBEDDING: 'embedding',
  } as const,
} as const;

/**
 * Helper function to check if file extension is allowed
 */
export function isAllowedFileExtension(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return KNOWLEDGE_BASE_CONFIG.ALLOWED_EXTENSIONS.includes(ext as any);
}

/**
 * Helper function to check if MIME type is allowed
 */
export function isAllowedMimeType(mimetype: string): boolean {
  return KNOWLEDGE_BASE_CONFIG.ALLOWED_MIMES.some(mime => mimetype.includes(mime)) ||
         mimetype === 'application/octet-stream';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return '.' + filename.split('.').pop()?.toLowerCase();
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
