/**
 * Delete File Use Case
 * Deletes file from storage and database
 */

import { IFileRepository } from '../../../domain/repositories';
import { FileId } from '../../../domain/value-objects';
import { IFileStorageService } from '../../services';

export class DeleteFileUseCase {
  constructor(
    private fileRepository: IFileRepository,
    private fileStorageService: IFileStorageService
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
