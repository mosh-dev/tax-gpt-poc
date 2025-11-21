/**
 * Conversation Routes
 * Defines routes for conversation operations
 */

import { Router } from 'express';
import { ConversationController } from '../controllers';

export function createConversationRoutes(controller: ConversationController): Router {
  const router = Router();

  // GET /api/chat/conversations - Get all conversations
  router.get('/', (req, res) => controller.getAll(req, res));

  // GET /api/chat/conversations/:id - Get specific conversation
  router.get('/:id', (req, res) => controller.getById(req, res));

  // DELETE /api/chat/conversations/:id - Delete conversation
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}
