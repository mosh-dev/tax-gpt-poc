/**
 * Knowledge Base Configuration Constants (Frontend)
 * Should match backend constants in server/src/shared/constants/knowledge-base.ts
 */

export const KNOWLEDGE_BASE_CONFIG = {
  /**
   * Allowed file extensions for knowledge base uploads
   */
  ALLOWED_EXTENSIONS: ['.txt', '.md', '.pdf'] as const,

  /**
   * Maximum file size for knowledge base uploads (50MB)
   */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /**
   * Maximum number of files per upload request
   */
  MAX_FILES_PER_UPLOAD: 10,
} as const;

/**
 * Helper function to check if file extension is allowed
 */
export function isAllowedFileExtension(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return KNOWLEDGE_BASE_CONFIG.ALLOWED_EXTENSIONS.includes(ext as any);
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

/**
 * Get formatted max file size string
 */
export function getMaxFileSizeString(): string {
  return formatFileSize(KNOWLEDGE_BASE_CONFIG.MAX_FILE_SIZE);
}
