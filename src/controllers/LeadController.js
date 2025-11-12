import LeadService from '../services/LeadService.js';

class LeadController {
    createLead = async (req, res) => {
        try {
            const { message } = req.body;
            const { propertyId } = req.params;
            const buyerId = req.user.userId;
            const io = req.app.get('io');

            const leadService = new LeadService(io);
            const lead = await leadService.createLead({
                propertyId,
                buyerId,
                message,
            });

            res.status(201).json({ success: true, lead });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    getBuyerLeads = async (req, res) => {
        try {
            const leadService = new LeadService(req.app.get('io'));
            const leads = await leadService.getLeadsForBuyer(req.user.userId);
            res.json({ success: true, leads });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    getOwnerLeads = async (req, res) => {
        try {
            const leadService = new LeadService(req.app.get('io'));
            const leads = await leadService.getLeadsForOwner(req.user.userId);
            res.json({ success: true, leads });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    updateLeadStatus = async (req, res) => {
        try {
            const { status } = req.body;
            const { leadId } = req.params;

            const leadService = new LeadService(req.app.get('io'));
            const lead = await leadService.updateStatus({
                leadId,
                ownerId: req.user.userId,
                status,
            });

            res.json({ success: true, lead });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };
}

export default new LeadController();

