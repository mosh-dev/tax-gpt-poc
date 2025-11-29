/**
 * Chat Controller
 * Handles HTTP requests for chat operations (SSE streaming)
 */
import { Request, Response } from 'express';
import { getErrorMessage } from '@utils/error-handler';
import { StreamChatUseCase } from '@domains/conversation/use-cases/stream-chat.use-case';
import { StreamChatRequestDTO } from '@domains/conversation/dtos/chat-dto';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

export class ChatController {
  private streamChatUseCase = injectFromContainer(StreamChatUseCase);
  private readonly logger = injectFromContainer(AgentLoggerService);

  /**
   * POST /api/chat/stream-with-tools
   * Stream chat responses with SSE
   */
  async streamChat(req: Request, res: Response): Promise<void> {
    try {
      // Support both threadId and conversationId for backwards compatibility
      const { message, agentMessage, conversationHistory, conversationId, threadId } = req.body;

      // Use agentMessage if provided (workflow messages), otherwise use message
      const contentForAgent = agentMessage || message;
      const contentForUser = message || agentMessage;

      // Validate request
      if (!contentForAgent || contentForAgent.trim().length === 0) {
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
      // Use contentForAgent (agentMessage || message) for LLM processing
      const requestDTO: StreamChatRequestDTO = {
        message: contentForAgent,
        userMessage: contentForUser,
        conversationId: threadId || conversationId,
        conversationHistory,
      };

      // Stream events
      try {
        for await (const event of this.streamChatUseCase.execute(requestDTO)) {
          // Check if client disconnected
          if (!res.writable) {
            this.logger.info('[ChatController] Client disconnected - stopping stream');
            break;
          }

          // Send event
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        res.end();
      } catch (streamError: unknown) {
        const streamErrorMsg = getErrorMessage(streamError);
        this.logger.error('[ChatController] Streaming error:', streamErrorMsg);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: streamErrorMsg,
          timestamp: new Date().toISOString(),
        })}\n\n`);
        res.end();
      }
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      this.logger.error('[ChatController] Chat stream error:', errorMsg);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
