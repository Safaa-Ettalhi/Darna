import PlanService from '../services/PlanService.js';

class PlanController {
    constructor() {
        this.planService = new PlanService();
    }

    getAllPlans = async (req, res) => {
        try {
            const plans = await this.planService.getAllPlans();
            res.json({ success: true, plans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    getPlanById = async (req, res) => {
        try {
            const plan = await this.planService.getPlanById(req.params.id);
            if (!plan) return res.status(404).json({ success: false, message: 'Plan non trouvé' });
            res.json({ success: true, plan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    initDefaultPlans = async (req, res) => {
        try {
            await this.planService.createDefaultPlans();
            const plans = await this.planService.getAllPlans();
            res.json({ 
                success: true, 
                message: 'Plans par défaut créés',
                plans 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

export default PlanController;
