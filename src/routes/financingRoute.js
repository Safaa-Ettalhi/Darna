import express from 'express';
import FinancingController from '../controllers/FinancingController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/offers', FinancingController.listOffers);
router.post('/offers', authenticateToken, requireRole('admin'), FinancingController.createOffer);

router.post('/simulate', authenticateToken, FinancingController.simulateLoan);
router.get('/simulate/history', authenticateToken, FinancingController.listSimulations);
router.post('/simulate/tirelire', authenticateToken, FinancingController.suggestTirelire);
router.post('/simulate/tirelire/create-group', authenticateToken, FinancingController.createTirelireGroup);

export default router;

