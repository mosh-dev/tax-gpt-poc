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
