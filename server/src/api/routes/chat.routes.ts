/**
 * Chat Routes
 * Defines routes for chat operations
 */

import { Router } from 'express';
import { mongoMemory } from '@services/mongodb-memory';
import { getErrorMessage } from '@utils/error-handler';
import { ChatController } from '@api/controllers/chat.controller';

export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  // POST /api/chat/stream-with-tools - Stream chat with SSE
  router.post('/stream-with-tools', (req, res) => controller.streamChat(req, res));

  // POST /api/chat/messages - Save messages to a conversation (for workflows)
  router.post('/messages', async (req, res) => {
    try {
      const { threadId, messages } = req.body;

      if (!threadId) {
        return res.status(400).json({
          success: false,
          error: 'threadId is required',
        });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'messages array is required',
        });
      }

      // Ensure conversation exists
      await mongoMemory.getOrCreateConversation(threadId, messages[0]?.content || 'Tax Calculation Workflow');

      // Save each message
      for (const msg of messages) {
        await mongoMemory.saveMessage(threadId, {
          role: msg.role,
          content: msg.content,
          toolCalls: msg.toolCalls,
        });
      }

      console.log(`[Chat] Saved ${messages.length} workflow messages to thread ${threadId}`);

      res.json({
        success: true,
        threadId,
        savedCount: messages.length,
      });
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[Chat] Failed to save messages:', errorMsg);
      res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  });

  return router;
}
