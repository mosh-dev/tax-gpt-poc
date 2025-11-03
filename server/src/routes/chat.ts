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
