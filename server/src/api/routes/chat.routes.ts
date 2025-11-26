/**
 * Chat Routes
 * Defines routes for chat operations
 */

import { Router } from 'express';
import { ChatController } from '@api/controllers/chat.controller';
import { injectFromContainer } from '@/app/di-container/container';

const router = Router();

// POST /api/chat/stream-with-tools - Stream chat with SSE
router.post('/stream-with-tools', (req, res) => injectFromContainer(ChatController).streamChat(req, res));

export const chatRoutes = router;
