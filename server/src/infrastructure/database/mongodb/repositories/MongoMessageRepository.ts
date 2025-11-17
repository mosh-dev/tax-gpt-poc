/**
 * MongoDB Message Repository Implementation
 * Implements IMessageRepository using MongoDB
 */

import { IMessageRepository } from '../../../../core/domain/repositories';
import { Message } from '../../../../core/domain/entities';
import { MessageId, ConversationId } from '../../../../core/domain/value-objects';
import { Message as MessageModel } from '../../../../models';
import { MessageMapper } from '../mappers';

export class MongoMessageRepository implements IMessageRepository {
  async create(message: Message): Promise<Message> {
    const data = MessageMapper.toPersistence(message);
    const doc = await MessageModel.create(data);
    return MessageMapper.toDomain(doc.toObject());
  }

  async findById(id: MessageId): Promise<Message | null> {
    const doc = await MessageModel.findOne({ messageId: id.value }).lean();
    return doc ? MessageMapper.toDomain(doc) : null;
  }

  async findByConversationId(conversationId: ConversationId, limit: number = 200): Promise<Message[]> {
    const docs = await MessageModel.find({ conversationId: conversationId.value })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return MessageMapper.toDomainArray(docs);
  }

  async delete(id: MessageId): Promise<void> {
    await MessageModel.deleteOne({ messageId: id.value });
  }

  async deleteByConversationId(conversationId: ConversationId): Promise<void> {
    await MessageModel.deleteMany({ conversationId: conversationId.value });
  }

  async countByConversationId(conversationId: ConversationId): Promise<number> {
    return await MessageModel.countDocuments({ conversationId: conversationId.value });
  }

  async getLatestByConversationId(conversationId: ConversationId): Promise<Message | null> {
    const doc = await MessageModel.findOne({ conversationId: conversationId.value })
      .sort({ createdAt: -1 })
      .lean();

    return doc ? MessageMapper.toDomain(doc) : null;
  }
}
