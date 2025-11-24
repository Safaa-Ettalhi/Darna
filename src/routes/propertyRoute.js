import express from 'express';
import multer from 'multer';
import PropertyController from '../controllers/PropertyController.js';
import verifyOwnership from '../middlewares/verifyOwnership.js';
import { authenticateToken, optionalAuth } from '../middlewares/authMiddleware.js';
import LeadController from '../controllers/LeadController.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

router.get('/search', optionalAuth, PropertyController.searchPropreties);
router.get('/stats/premium', authenticateToken, PropertyController.getPremiumStats);
router.get('/:id', optionalAuth, PropertyController.getProperty);
router.post('/', authenticateToken, PropertyController.createproperty);
router.put('/:id', authenticateToken, verifyOwnership, PropertyController.updateProperty);
router.delete('/:id', authenticateToken, verifyOwnership, PropertyController.deleteProperty);
router.post('/:id/leads', authenticateToken, (req, res, next) => {
    req.params.propertyId = req.params.id;
    return LeadController.createLead(req, res, next);
});
router.post('/:id/media', authenticateToken, verifyOwnership, upload.array('files', 10), PropertyController.uploadMedia);
router.delete('/:id/media/:mediaId', authenticateToken, verifyOwnership, PropertyController.removeMedia);

export default router;