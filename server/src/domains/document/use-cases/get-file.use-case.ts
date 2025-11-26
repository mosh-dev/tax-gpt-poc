/**
 * Get File Use Case
 * Retrieves file metadata
 */
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { FileDTO } from '@domains/document/dtos/file-dto';
import { FileId } from '@domains/document/value-objects/file-id.class';
import { injectFromContainer } from '@/app/di-container/container';

export class GetFileUseCase {
  private fileRepository = injectFromContainer(MongoFileRepository);

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
