/**
 * Chat Controller
 * Handles HTTP requests for chat operations (SSE streaming)
 */

import { Request, Response } from 'express';
import { StreamChatUseCase } from '../../../core/application/use-cases';
import { StreamChatRequestDTO } from '../../../core/application/dtos';

export class ChatController {
  constructor(private streamChatUseCase: StreamChatUseCase) {}

  /**
   * POST /api/chat/stream-with-tools
   * Stream chat responses with SSE
   */
  async streamChat(req: Request, res: Response): Promise<void> {
    try {
      // Support both threadId and conversationId for backwards compatibility
      const { message, conversationHistory, conversationId, threadId } = req.body;

      // Validate request
      if (!message || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Message is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Setup SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Prepare request DTO - prefer threadId over conversationId
      const requestDTO: StreamChatRequestDTO = {
        message,
        conversationId: threadId || conversationId,
        conversationHistory,
      };

      // Stream events
      try {
        for await (const event of this.streamChatUseCase.execute(requestDTO)) {
          // Check if client disconnected
          if (!res.writable) {
            console.log('[ChatController] Client disconnected - stopping stream');
            break;
          }

          // Send event
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        res.end();
      } catch (streamError: any) {
        console.error('[ChatController] Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: streamError.message || 'Streaming error occurred',
          timestamp: new Date().toISOString(),
        })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error('[ChatController] Chat stream error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to start chat stream',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
