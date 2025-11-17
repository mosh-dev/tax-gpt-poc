/**
 * File Repository Interface
 * Contract for file data access
 */

import { File } from '../entities';
import { FileId, ConversationId } from '../value-objects';

export interface IFileRepository {
  /**
   * Create a new file record
   */
  create(file: File): Promise<File>;

  /**
   * Find file by ID
   */
  findById(id: FileId): Promise<File | null>;

  /**
   * Find files by conversation ID
   */
  findByConversationId(conversationId: ConversationId): Promise<File[]>;

  /**
   * Update file
   */
  update(file: File): Promise<void>;

  /**
   * Delete file
   */
  delete(id: FileId): Promise<void>;

  /**
   * Find expired files
   */
  findExpired(): Promise<File[]>;

  /**
   * Find unprocessed files
   */
  findUnprocessed(limit?: number): Promise<File[]>;

  /**
   * Check if file exists
   */
  exists(id: FileId): Promise<boolean>;
}
