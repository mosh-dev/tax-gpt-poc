/**
 * File Repository Interface
 * Contract for file data access
 */
import { FileId } from '@core/domain/value-objects/FileId';
import { ConversationId } from '@core/domain/value-objects/ConversationId';
import { TaxGptFile } from '@core/domain/entities/TaxGptFile';

export interface IFileRepository {
  /**
   * Create a new file record
   */
  create(file: TaxGptFile): Promise<TaxGptFile>;

  /**
   * Find file by ID
   */
  findById(id: FileId): Promise<TaxGptFile | null>;

  /**
   * Find files by conversation ID
   */
  findByConversationId(conversationId: ConversationId): Promise<TaxGptFile[]>;

  /**
   * Update file
   */
  update(file: TaxGptFile): Promise<void>;

  /**
   * Delete file
   */
  delete(id: FileId): Promise<void>;

  /**
   * Find expired files
   */
  findExpired(): Promise<TaxGptFile[]>;

  /**
   * Find unprocessed files
   */
  findUnprocessed(limit?: number): Promise<TaxGptFile[]>;

  /**
   * Check if file exists
   */
  exists(id: FileId): Promise<boolean>;
}
