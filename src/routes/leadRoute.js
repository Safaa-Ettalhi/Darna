import express from 'express';
import LeadController from '../controllers/LeadController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/me/buyer', authenticateToken, LeadController.getBuyerLeads);
router.get('/me/owner', authenticateToken, LeadController.getOwnerLeads);
router.patch('/:leadId/status', authenticateToken, LeadController.updateLeadStatus);
router.post('/:propertyId', authenticateToken, LeadController.createLead);

export default router;

