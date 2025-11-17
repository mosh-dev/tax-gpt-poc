/**
 * Get File Use Case
 * Retrieves file metadata
 */

import { IFileRepository } from '../../../domain';
import { FileId } from '../../../domain';
import { FileDTO } from '../../dtos';

export class GetFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(fileId: string): Promise<FileDTO> {
    const id = FileId.create(fileId);
    const file = await this.fileRepository.findById(id);

    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    return {
      fileId: file.id.value,
      conversationId: file.conversationId?.value,
      originalName: file.metadata.originalName,
      storedPath: file.storedPath,
      url: file.metadata.url,
      mimeType: file.metadata.mimeType,
      size: file.metadata.size,
      processed: file.processed,
      ocrResult: file.ocrResult,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
    };
  }
}
