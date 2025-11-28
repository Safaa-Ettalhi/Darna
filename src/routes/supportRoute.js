import express from 'express';
import SupportController from '../controllers/SupportController.js';
import { authenticateToken, optionalAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
const adminGuard = [authenticateToken, requireRole('admin')];

router.post('/tickets', optionalAuth, SupportController.createTicket);
router.get('/tickets', authenticateToken, SupportController.listUserTickets);
router.get('/admin/tickets', adminGuard, SupportController.listAllTickets);
router.patch('/admin/tickets/:ticketId', adminGuard, SupportController.updateTicket);

export default router;

