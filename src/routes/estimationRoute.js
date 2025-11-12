import express from 'express';
import EstimationController from '../controllers/EstimationController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validatorMiddleware.js';
import { estimationRequestSchema } from '../../validation/estimationValidation.js';

const router = express.Router();

router.post('/calculate', authenticateToken, validateRequest(estimationRequestSchema), EstimationController.calculate);
router.get('/history', authenticateToken, EstimationController.history);

export default router;

