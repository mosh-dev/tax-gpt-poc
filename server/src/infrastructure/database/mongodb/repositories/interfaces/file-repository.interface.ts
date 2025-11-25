/**
 * File Repository Interface
 * Contract for file data access
 */
import { FileId } from '@domains/document/value-objects/file-id.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { TaxGptFile } from '@domains/document/entities/tax-gpt-file.class';

export interface IFileRepository {
  create(file: TaxGptFile): Promise<TaxGptFile>;
  findById(id: FileId): Promise<TaxGptFile | null>;
  findByConversationId(conversationId: ConversationId): Promise<TaxGptFile[]>;
  update(file: TaxGptFile): Promise<void>;
  delete(id: FileId): Promise<void>;
  findExpired(): Promise<TaxGptFile[]>;
  findUnprocessed(limit?: number): Promise<TaxGptFile[]>;
  exists(id: FileId): Promise<boolean>;
}
