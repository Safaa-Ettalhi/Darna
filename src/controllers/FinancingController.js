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
            const darnaToken = req.headers.authorization?.split(' ')[1];
            
            if (!darnaToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Token d\'authentification requis'
                });
            }

            console.log(' Création groupe Tirelire - Données reçues:', {
                body: req.body,
                userId: req.user.userId,
            });

            const payload = {
                ...req.body,
                userId: req.user.userId,
                token: darnaToken, // Passer le token JWT de Darna à Tirelire
            };

            const result = await this.service.createTirelireGroup(payload);
            res.status(201).json({ success: true, group: result });
        } catch (error) {
            console.error(' Erreur dans createTirelireGroup:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status,
            });

            const status = error.response?.status || 400;
            const errorMessage = error.message || 'Erreur inconnue lors de la création du groupe';
            
            res.status(status).json({
                success: false,
                message: errorMessage,
                details: error.response?.data || undefined, 
            });
        }
    };
}

export default new FinancingController();

