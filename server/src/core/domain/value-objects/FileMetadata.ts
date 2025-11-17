/**
 * FileMetadata Value Object
 * Immutable file metadata
 */

export class FileMetadata {
  constructor(
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly url: string
  ) {
    if (!originalName || originalName.trim().length === 0) {
      throw new Error('Original name cannot be empty');
    }
    if (!mimeType || mimeType.trim().length === 0) {
      throw new Error('MIME type cannot be empty');
    }
    if (size < 0) {
      throw new Error('File size cannot be negative');
    }
    if (!url || url.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }
  }

  /**
   * Get file extension
   */
  getExtension(): string {
    const parts = this.originalName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Check if file is an image
   */
  isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  isPDF(): boolean {
    return this.mimeType === 'application/pdf';
  }

  /**
   * Get human-readable file size
   */
  getHumanReadableSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
