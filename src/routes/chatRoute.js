import express from 'express';
import multer from 'multer';
import ChatController from '../controllers/ChatController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
    },
});

router.use(authenticateToken);

router.get('/threads', ChatController.getThreads);
router.get('/threads/:threadId', ChatController.getThread);
router.get('/threads/:threadId/messages', ChatController.getMessages);
router.post('/threads/:threadId/messages', ChatController.sendMessage);
router.post('/threads/:threadId/attachments', upload.single('file'), ChatController.uploadAttachment);
router.patch('/messages/:messageId/read', ChatController.markMessageRead);
router.delete('/threads/:threadId', ChatController.deleteThread);

export default router;