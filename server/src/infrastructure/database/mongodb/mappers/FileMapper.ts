/**
 * File Mapper
 * Maps between domain entities and MongoDB models
 */
import { FileData } from '@models/file.model';
import { TaxGptFile } from '@core/domain/entities/TaxGptFile';
import { ConversationId } from '@core/domain/value-objects/ConversationId';
import { FileMetadata } from '@core/domain/value-objects/FileMetadata';
import { FileId } from '@core/domain/value-objects/FileId';

export class FileMapper {
  /**
   * Map from domain entity to database model
   */
  static toPersistence(file: TaxGptFile): Partial<FileData> {
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

  /**
   * Map from database model to domain entity
   */
  static toDomain(data: FileData): TaxGptFile {
    const metadata = new FileMetadata(
      data.originalName,
      data.mimeType,
      data.size,
      data.url
    );

    // Database and domain OCR result types are now compatible
    const domainOCRResult = data.ocrResult;

    const file = new TaxGptFile(
      FileId.create(data.fileId),
      metadata,
      data.conversationId ? ConversationId.create(data.conversationId) : undefined,
      data.storedPath,
      data.processed,
      domainOCRResult,
      data.uploadedAt,
      data.expiresAt
    );

    return file;
  }

  /**
   * Map array of database models to domain entities
   */
  static toDomainArray(dataArray: FileData[]): TaxGptFile[] {
    return dataArray.map(data => this.toDomain(data));
  }
}
