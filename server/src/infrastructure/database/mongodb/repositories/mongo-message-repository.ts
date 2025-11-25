/**
 * MongoDB Message Repository Implementation
 * Implements IMessageRepository using MongoDB
 */
import { IMessageRepository } from '@core/domain/repositories/IMessageRepository';
import { TaxGptMessage } from '@core/domain/entities/TaxGptMessage';
import { MessageMapper } from '@infrastructure/database/mongodb/mappers/message-mapper';
import { MessageModel } from '@domains/conversation/message.model';
import { MessageId } from '@core/domain/value-objects/MessageId';
import { ConversationId } from '@core/domain/value-objects/ConversationId';

export class MongoMessageRepository implements IMessageRepository {
  async create(message: TaxGptMessage): Promise<TaxGptMessage> {
    const data = MessageMapper.toPersistence(message);
    const doc = await MessageModel.create(data);
    return MessageMapper.toDomain(doc.toObject());
  }

  async findById(id: MessageId): Promise<TaxGptMessage | null> {
    const doc = await MessageModel.findOne({ messageId: id.value }).lean();
    return doc ? MessageMapper.toDomain(doc) : null;
  }

  async findByConversationId(conversationId: ConversationId, limit: number = 200): Promise<TaxGptMessage[]> {
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
    return MessageModel.countDocuments({conversationId: conversationId.value});
  }

  async getLatestByConversationId(conversationId: ConversationId): Promise<TaxGptMessage | null> {
    const doc = await MessageModel.findOne({ conversationId: conversationId.value })
      .sort({ createdAt: -1 })
      .lean();

    return doc ? MessageMapper.toDomain(doc) : null;
  }
}
