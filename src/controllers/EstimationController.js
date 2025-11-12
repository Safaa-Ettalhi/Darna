import EstimationService from '../services/EstimationService.js';

class EstimationController {
    constructor() {
        this.service = new EstimationService();
    }

    calculate = async (req, res) => {
        try {
            const { propertyId, ...payload } = req.body;
            const estimation = await this.service.estimate({
                userId: req.user.userId,
                propertyId,
                payload,
            });

            res.status(201).json({ success: true, estimation });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    history = async (req, res) => {
        try {
            const history = await this.service.getHistory(req.user.userId);
            res.json({ success: true, history });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

export default new EstimationController();

