import express from 'express';
import ChatController from '../controllers/ChatController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/threads', ChatController.getThreads);
router.get('/threads/:threadId', ChatController.getThread);
router.get('/threads/:threadId/messages', ChatController.getMessages);
router.post('/threads/:threadId/messages', ChatController.sendMessage);
router.patch('/messages/:messageId/read', ChatController.markMessageRead);

export default router;