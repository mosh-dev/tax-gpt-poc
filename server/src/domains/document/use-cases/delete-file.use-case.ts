/**
 * Delete File Use Case
 * Deletes file from storage and database
 */
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { LocalFileStorageService } from '@infrastructure/storage/local-file-storage.service';
import { FileId } from '@domains/document/value-objects/file-id.class';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

export class DeleteFileUseCase {
  private fileRepository = injectFromContainer(MongoFileRepository);
  private fileStorageService = injectFromContainer(LocalFileStorageService);
  private logger = injectFromContainer(LoggerService);

  async execute(fileId: string): Promise<void> {
    const id = FileId.create(fileId);
    const file = await this.fileRepository.findById(id);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    try {
      await this.fileStorageService.deleteFile(file.storedPath);
    } catch (error) {
      this.logger.error({ error }, `[DeleteFileUseCase] Failed to delete physical file: ${file.storedPath}`);
    }
    await this.fileRepository.delete(id);
  }
}
