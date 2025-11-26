/**
 * Delete File Use Case
 * Deletes file from storage and database
 */
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { LocalFileStorageService } from '@infrastructure/storage/local-file-storage.service';
import { FileId } from '@domains/document/value-objects/file-id.class';
import { injectFromContainer } from '@/app/di-container/container-helper';

export class DeleteFileUseCase {
  private fileRepository = injectFromContainer(MongoFileRepository);
  private fileStorageService = injectFromContainer(LocalFileStorageService);

  async execute(fileId: string): Promise<void> {
    const id = FileId.create(fileId);

    // Get file
    const file = await this.fileRepository.findById(id);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Delete from storage
    try {
      await this.fileStorageService.deleteFile(file.storedPath);
    } catch (error) {
      console.error(`[DeleteFileUseCase] Failed to delete physical file: ${file.storedPath}`, error);
      // Continue with database deletion even if physical deletion fails
    }

    // Delete from database
    await this.fileRepository.delete(id);
  }
}
