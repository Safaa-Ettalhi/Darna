import express from 'express';
import PlanController from '../controllers/PlanController.js';
import SubscriptionController from '../controllers/SubscriptionController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
const planController = new PlanController();
const subscriptionController = new SubscriptionController();

// Routes publiques
router.get('/plans', planController.getAllPlans);
router.get('/plans/:id', planController.getPlanById);
router.post('/init-plans', authenticateToken, requireRole('admin'), planController.initDefaultPlans);

// Routes protégées
router.post('/subscribe', authenticateToken, subscriptionController.subscribe);
router.get('/my-subscription', authenticateToken, subscriptionController.getMySubscription);
router.delete('/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.post('/stripe-session', authenticateToken, subscriptionController.createStripeSession);
router.post('/cron/run', authenticateToken, subscriptionController.runCronNow);

export default router;
