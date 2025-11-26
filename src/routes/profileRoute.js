import express from 'express';
import ProfileController from '../controllers/ProfileController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.patch('/', authenticateToken, ProfileController.updateProfile);
router.patch('/company', authenticateToken, ProfileController.updateCompanyInfo);

export default router;

