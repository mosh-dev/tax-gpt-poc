/**
 * MongoDB File Repository Implementation
 * Implements IFileRepository using MongoDB
 */

import { IFileRepository } from '@core/domain/repositories';
import { File as FileEntity } from '@core/domain/entities';
import { FileId, ConversationId } from '@core/domain/value-objects';
import { File as FileModel } from '@models/file.model';
import { FileMapper } from '../mappers';

export class MongoFileRepository implements IFileRepository {
  async create(file: FileEntity): Promise<FileEntity> {
    const data = FileMapper.toPersistence(file);
    const doc = await FileModel.create(data);
    return FileMapper.toDomain(doc.toObject());
  }

  async findById(id: FileId): Promise<FileEntity | null> {
    const doc = await FileModel.findOne({ fileId: id.value }).lean();
    return doc ? FileMapper.toDomain(doc) : null;
  }

  async findByConversationId(conversationId: ConversationId): Promise<FileEntity[]> {
    const docs = await FileModel.find({ conversationId: conversationId.value })
      .sort({ uploadedAt: -1 })
      .lean();

    return FileMapper.toDomainArray(docs);
  }

  async update(file: FileEntity): Promise<void> {
    const data = FileMapper.toPersistence(file);
    await FileModel.updateOne(
      { fileId: file.id.value },
      { $set: data }
    );
  }

  async delete(id: FileId): Promise<void> {
    await FileModel.deleteOne({ fileId: id.value });
  }

  async findExpired(): Promise<FileEntity[]> {
    const docs = await FileModel.find({
      expiresAt: { $lt: new Date() },
    }).lean();

    return FileMapper.toDomainArray(docs);
  }

  async findUnprocessed(limit: number = 100): Promise<FileEntity[]> {
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
