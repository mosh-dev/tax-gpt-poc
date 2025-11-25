/**
 * MongoDB Conversation Repository Implementation
 * Implements IConversationRepository using MongoDB
 */
import { IConversationRepository } from '@core/domain/repositories/IConversationRepository';
import { TaxGptConversation } from '@core/domain/entities/TaxGptConversation';
import { ConversationMapper } from '@infrastructure/database/mongodb/mappers/conversation-mapper';
import { ConversationId } from '@core/domain/value-objects/ConversationId';
import { ConversationModel } from '@domains/conversation/conversation.model';

export class MongoConversationRepository implements IConversationRepository {
  async create(conversation: TaxGptConversation): Promise<TaxGptConversation> {
    const data = ConversationMapper.toPersistence(conversation);
    const doc = await ConversationModel.create(data);
    return ConversationMapper.toDomain(doc.toObject());
  }

  async findById(id: ConversationId): Promise<TaxGptConversation | null> {
    const doc = await ConversationModel.findOne({ conversationId: id.value }).lean();
    return doc ? ConversationMapper.toDomain(doc) : null;
  }

  async findAll(userId?: string, limit: number = 50): Promise<TaxGptConversation[]> {
    const query = userId ? { userId } : {};
    const docs = await ConversationModel.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return ConversationMapper.toDomainArray(docs);
  }

  async update(conversation: TaxGptConversation): Promise<void> {
    const data = ConversationMapper.toPersistence(conversation);
    await ConversationModel.updateOne(
      { conversationId: conversation.id.value },
      { $set: data }
    );
  }

  async delete(id: ConversationId): Promise<void> {
    await ConversationModel.deleteOne({ conversationId: id.value });
  }

  async search(query: string, userId?: string, limit: number = 20): Promise<TaxGptConversation[]> {
    const searchQuery: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $regex: query, $options: 'i' } },
      ],
    };

    if (userId) {
      searchQuery.userId = userId;
    }

    const docs = await ConversationModel.find(searchQuery)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return ConversationMapper.toDomainArray(docs);
  }

  async exists(id: ConversationId): Promise<boolean> {
    const count = await ConversationModel.countDocuments({ conversationId: id.value });
    return count > 0;
  }

  async findOrCreate(conversation: TaxGptConversation): Promise<TaxGptConversation> {
    const data = ConversationMapper.toPersistence(conversation);

    // Use findOneAndUpdate with upsert for atomic operation
    const doc = await ConversationModel.findOneAndUpdate(
      { conversationId: conversation.id.value },
      {
        $setOnInsert: {
          conversationId: data.conversationId,
          title: data.title,
          taxYear: data.taxYear,
          userId: data.userId,
          metadata: data.metadata || {},
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return ConversationMapper.toDomain(doc!);
  }
}
