/**
 * Conversation Controller
 * Handles HTTP requests for conversation operations
 */

import { Request, Response } from 'express';
import {
  GetAllConversationsUseCase,
  GetConversationHistoryUseCase,
  DeleteConversationUseCase,
} from '../../core/application/use-cases';

export class ConversationController {
  constructor(
    private getAllConversationsUseCase: GetAllConversationsUseCase,
    private getConversationHistoryUseCase: GetConversationHistoryUseCase,
    private deleteConversationUseCase: DeleteConversationUseCase
  ) {}

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
    } catch (error: any) {
      console.error('[ConversationController] Failed to get conversations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve conversations',
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
    } catch (error: any) {
      console.error('[ConversationController] Failed to get conversation:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to retrieve conversation',
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
    } catch (error: any) {
      console.error('[ConversationController] Failed to delete conversation:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete conversation',
        });
      }
    }
  }
}
