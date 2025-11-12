import express from 'express';
import AdminController from '../controllers/AdminController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
const adminGuard = [authenticateToken, requireRole('admin')];

router.get('/overview', adminGuard, AdminController.overview);
router.get('/properties/pending', adminGuard, AdminController.listPendingProperties);
router.patch('/properties/:propertyId/status', adminGuard, AdminController.updatePropertyStatus);
router.get('/leads', adminGuard, AdminController.listLeads);

export default router;

