/**
 * Conversation Controller
 * Handles HTTP requests for conversation operations
 */
import { Request, Response } from 'express';
import { getErrorMessage } from '@utils/error-handler';
import { GetAllConversationsUseCase } from '@domains/conversation/use-cases/get-all-conversations.use-case';
import { GetConversationHistoryUseCase } from '@domains/conversation/use-cases/get-conversation-history.use-case';
import { DeleteConversationUseCase } from '@domains/conversation/use-cases/delete-conversation.use-case';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

export class ConversationController {
  private readonly getAllConversationsUseCase = injectFromContainer(GetAllConversationsUseCase);
  private readonly getConversationHistoryUseCase = injectFromContainer(GetConversationHistoryUseCase);
  private readonly deleteConversationUseCase = injectFromContainer(DeleteConversationUseCase);

  private readonly logger = injectFromContainer(LoggerService);

  /**
   * GET /api/chat/conversations
   * Get all conversations
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { userId, limit } = req.query;

      const conversations = await this.getAllConversationsUseCase.execute(
        userId as string | undefined,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        conversations,
      });
    } catch (error) {
      this.logger.error({ error }, '[ConversationController] Failed to get conversations');
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * GET /api/chat/conversations/:id
   * Get specific conversation with messages
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const result = await this.getConversationHistoryUseCase.execute(
        id,
        limit ? parseInt(limit as string) : 200
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      this.logger.error({ error },'[ConversationController] Failed to get conversation');

      if (errorMsg.includes('not found')) {
        res.status(404).json({
          success: false,
          error: errorMsg,
        });
      } else {
        res.status(500).json({
          success: false,
          error: errorMsg,
        });
      }
    }
  }

  /**
   * DELETE /api/chat/conversations/:id
   * Delete a conversation
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.deleteConversationUseCase.execute(id);

      res.json({
        success: true,
        message: 'Conversation deleted',
      });
    } catch (error) {
      this.logger.error({ error },'[ConversationController] Failed to delete conversation');

      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes('not found')) {
        res.status(404).json({
          success: false,
          error: errorMsg,
        });
      } else {
        res.status(500).json({
          success: false,
          error: errorMsg,
        });
      }
    }
  }
}
