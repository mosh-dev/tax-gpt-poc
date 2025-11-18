/**
 * Chat Routes
 * Defines routes for chat operations
 */

import { Router } from 'express';
import { ChatController } from '../controllers';

export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  debugger;

  // POST /api/chat/stream-with-tools - Stream chat with SSE
  router.post('/stream-with-tools', (req, res) => controller.streamChat(req, res));

  return router;
}
