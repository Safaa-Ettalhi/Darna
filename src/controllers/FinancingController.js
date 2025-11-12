import FinancingService from '../services/FinancingService.js';

class FinancingController {
    constructor() {
        this.service = new FinancingService();
    }

    listOffers = async (req, res) => {
        try {
            const offers = await this.service.listBankOffers();
            res.json({ success: true, offers });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    createOffer = async (req, res) => {
        try {
            const offer = await this.service.createBankOffer(req.body);
            res.status(201).json({ success: true, offer });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    simulateLoan = async (req, res) => {
        try {
            const payload = {
                userId: req.user.userId,
                ...req.body,
            };
            const simulation = await this.service.simulateLoan(payload);
            res.status(201).json({ success: true, simulation });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    listSimulations = async (req, res) => {
        try {
            const simulations = await this.service.listSimulations(req.user.userId);
            res.json({ success: true, simulations });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    suggestTirelire = async (req, res) => {
        try {
            const suggestion = await this.service.suggestTirelirePlan(req.body);
            res.json({ success: true, suggestion });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    createTirelireGroup = async (req, res) => {
        try {
            const payload = {
                ...req.body,
                userId: req.user.userId,
            };

            const result = await this.service.createTirelireGroup(payload);
            res.status(201).json({ success: true, group: result });
        } catch (error) {
            const status = error.response?.status || 400;
            res.status(status).json({
                success: false,
                message: error.response?.data?.message || error.message,
            });
        }
    };
}

export default new FinancingController();

