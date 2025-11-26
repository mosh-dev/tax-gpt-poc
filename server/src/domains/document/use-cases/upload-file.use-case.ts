/**
 * Upload File Use Case
 * Handles file upload and storage
 */
import { IFileRepository } from '@infrastructure/database/mongodb/repositories/interfaces/file-repository.interface';
import { IFileStorageService } from '@infrastructure/interfaces/file-storage-service.interface';
import { FileDTO, UploadFileDTO } from '@domains/document/dtos/file-dto';
import { FileId } from '@domains/document/value-objects/file-id.class';
import { FileMetadata } from '@domains/document/value-objects/file-metadata.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { TaxGptFile } from '@domains/document/entities/tax-gpt-file.class';

export class UploadFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private fileStorageService: IFileStorageService
  ) {
  }

  async execute(data: UploadFileDTO): Promise<FileDTO> {
    // 1. Generate file ID and save to storage
    const fileId = FileId.generate();
    const extension = data.originalName.split('.').pop() || '';
    const fileName = `${fileId.value}.${extension}`;

    const storedFile = await this.fileStorageService.saveFile(
      data.buffer,
      fileName,
      {
        generateUrl: true,
        expiresIn: 60 * 60 * 1000, // 1 hour
      }
    );

    // 2. Create domain entity
    const metadata = new FileMetadata(
      data.originalName,
      data.mimeType,
      data.size,
      storedFile.url || this.fileStorageService.getFileUrl(fileName)
    );

    const fileEntity = new TaxGptFile(
      fileId,
      metadata,
      data.conversationId ? ConversationId.create(data.conversationId) : undefined,
      storedFile.path
    );

    // Set expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    fileEntity.setExpiration(expiresAt);

    // 3. Persist to database
    const saved = await this.fileRepository.create(fileEntity);

    // 4. Return DTO
    return {
      fileId: saved.id.value,
      conversationId: saved.conversationId?.value,
      originalName: saved.metadata.originalName,
      storedPath: saved.storedPath,
      url: saved.metadata.url,
      mimeType: saved.metadata.mimeType,
      size: saved.metadata.size,
      processed: saved.processed,
      ocrResult: saved.ocrResult,
      uploadedAt: saved.uploadedAt,
      expiresAt: saved.expiresAt,
    };
  }
}
