import { Router, Request, Response } from 'express';
import { taxAgent } from '../services/tax-agent';
import { ChatRequest, ChatResponse } from '../types';

const router = Router();

/**
 * POST /api/chat
 * Send a message to the tax assistant agent
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory }: ChatRequest = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString(),
      } as ChatResponse);
    }

    // Get response from tax agent
    const response = await taxAgent.chat(message, conversationHistory);

    res.json(response as ChatResponse);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message',
      timestamp: new Date().toISOString(),
    } as ChatResponse);
  }
});

/**
 * POST /api/chat/stream
 * Stream chat responses using Server-Sent Events (SSE)
 * Supports tool calling with user confirmation
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory }: ChatRequest = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    try {
      // Stream response from tax agent
      const stream = taxAgent.streamChat(message, conversationHistory);

      for await (const chunk of stream) {
        // Send each chunk as SSE data
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk, timestamp: new Date().toISOString() })}\n\n`);
      }

      // Send completion message
      res.write(`data: ${JSON.stringify({ type: 'done', timestamp: new Date().toISOString() })}\n\n`);
      res.end();
    } catch (streamError: any) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message, timestamp: new Date().toISOString() })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start chat stream',
        timestamp: new Date().toISOString(),
      });
    }
  }
});

/**
 * POST /api/chat/stream-with-tools
 * Stream chat responses with tool calling support
 * Handles tool calls and allows user confirmation
 */
router.post('/stream-with-tools', async (req: Request, res: Response) => {
    console.log(req.body);
  try {
    const { message, conversationHistory }: ChatRequest = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    try {
      // Get the full stream with tool support
      const fullStream = taxAgent.streamChatWithTools(message, conversationHistory);

      console.log('🔄 Starting stream for message:', message);

      for await (const event of fullStream) {
        console.log('📦 Stream event received:', {
          type: event.type,
          eventKeys: Object.keys(event),
          event: event
        });

        // Handle different event types from Mastra
        if (event.type === 'text-delta') {
          // Text chunk
          const textDelta = (event as any).textDelta;
          console.log('📝 Text chunk:', textDelta);
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: textDelta,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (event.type === 'tool-call') {
          // Tool call started
          const toolEvent = event as any;
          console.log('🔧 Tool call detected:', {
            toolName: toolEvent.toolName,
            toolCallId: toolEvent.toolCallId,
            args: toolEvent.args
          });
          res.write(`data: ${JSON.stringify({
            type: 'tool-call',
            toolName: toolEvent.toolName,
            toolCallId: toolEvent.toolCallId,
            args: toolEvent.args,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (event.type === 'tool-result') {
          // Tool execution completed
          const resultEvent = event as any;
          console.log('✅ Tool result received:', {
            toolCallId: resultEvent.toolCallId,
            toolName: resultEvent.toolName,
            result: resultEvent.result
          });
          res.write(`data: ${JSON.stringify({
            type: 'tool-result',
            toolCallId: resultEvent.toolCallId,
            toolName: resultEvent.toolName,
            result: resultEvent.result,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (event.type === 'finish') {
          // Stream completed
          const finishReason = (event as any).finishReason;
          console.log('🏁 Stream finished:', finishReason);
          res.write(`data: ${JSON.stringify({
            type: 'done',
            finishReason: finishReason,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else {
          // Log unknown event types
          console.log('❓ Unknown event type:', event.type, event);
        }
      }

      console.log('✅ Stream completed successfully');

      res.end();
    } catch (streamError: any) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message, timestamp: new Date().toISOString() })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start chat stream',
        timestamp: new Date().toISOString(),
      });
    }
  }
});

/**
 * POST /api/chat/generate-form
 * Generate tax form based on user data
 */
router.post('/generate-form', async (req: Request, res: Response) => {
  try {
    const { taxData } = req.body;

    if (!taxData) {
      return res.status(400).json({
        success: false,
        error: 'Tax data is required',
        timestamp: new Date().toISOString(),
      });
    }

    const response = await taxAgent.generateTaxForm(taxData);

    res.json(response);
  } catch (error: any) {
    console.error('Generate form error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate tax form',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
