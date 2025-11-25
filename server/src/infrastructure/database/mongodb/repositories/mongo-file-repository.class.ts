/**
 * MongoDB File Repository Implementation
 * Implements IFileRepository using MongoDB
 */
import { IFileRepository } from '@infrastructure/database/mongodb/repositories/interfaces/file-repository.interface';
import { TaxGptFile } from '@domains/document/entities/tax-gpt-file.class';
import { FileMapper } from '@infrastructure/database/mongodb/mappers/file-mapper.class';
import { FileId } from '@domains/document/value-objects/file-id.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { FileModel } from '@domains/document/models/file.model';

export class MongoFileRepository implements IFileRepository {
  async create(file: TaxGptFile): Promise<TaxGptFile> {
    const data = FileMapper.toPersistence(file);
    const doc = await FileModel.create(data);
    return FileMapper.toDomain(doc.toObject());
  }

  async findById(id: FileId): Promise<TaxGptFile | null> {
    const doc = await FileModel.findOne({ fileId: id.value }).lean();
    return doc ? FileMapper.toDomain(doc) : null;
  }

  async findByConversationId(conversationId: ConversationId): Promise<TaxGptFile[]> {
    const docs = await FileModel.find({ conversationId: conversationId.value })
      .sort({ uploadedAt: -1 })
      .lean();

    return FileMapper.toDomainArray(docs);
  }

  async update(file: TaxGptFile): Promise<void> {
    const data = FileMapper.toPersistence(file);
    await FileModel.updateOne(
      { fileId: file.id.value },
      { $set: data }
    );
  }

  async delete(id: FileId): Promise<void> {
    await FileModel.deleteOne({ fileId: id.value });
  }

  async findExpired(): Promise<TaxGptFile[]> {
    const docs = await FileModel.find({
      expiresAt: { $lt: new Date() },
    }).lean();

    return FileMapper.toDomainArray(docs);
  }

  async findUnprocessed(limit: number = 100): Promise<TaxGptFile[]> {
    const docs = await FileModel.find({ processed: false })
      .limit(limit)
      .lean();

    return FileMapper.toDomainArray(docs);
  }

  async exists(id: FileId): Promise<boolean> {
    const count = await FileModel.countDocuments({ fileId: id.value });
    return count > 0;
  }
}
