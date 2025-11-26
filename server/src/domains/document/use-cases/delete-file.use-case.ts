/**
 * Delete File Use Case
 * Deletes file from storage and database
 */
import { injectable } from 'tsyringe';
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { LocalFileStorageService } from '@infrastructure/storage/local-file-storage.service';
import { FileId } from '@domains/document/value-objects/file-id.class';

@injectable()
export class DeleteFileUseCase {
  constructor(
    private fileRepository: MongoFileRepository,
    private fileStorageService: LocalFileStorageService
  ) {}

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
