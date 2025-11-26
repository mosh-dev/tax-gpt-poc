import { Router } from 'express';
import { ConversationController } from '@api/controllers/conversation.controller';
import { injectFromContainer } from '@/app/di-container/container-helper';

const router = Router();

// GET /api/chat/conversations - Get all conversations
router.get('/', (req, res) => injectFromContainer(ConversationController).getAll(req, res));
router.get('/:id', (req, res) => injectFromContainer(ConversationController).getById(req, res));
router.delete('/:id', (req, res) => injectFromContainer(ConversationController).delete(req, res));

export const conversationRoutes = router;
