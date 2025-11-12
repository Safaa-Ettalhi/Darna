import SubscriptionService from '../services/SubscriptionService.js';

class SubscriptionController {
    constructor() {
        this.subscriptionService = new SubscriptionService();
    }

    subscribe = async (req, res) => {
        try {
            const subscription = await this.subscriptionService.createSubscription(req.user.userId, req.body.planId);
            res.json({ success: true, subscription });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    getMySubscription = async (req, res) => {
        try {
            const subscription = await this.subscriptionService.getUserSubscription(req.user.userId);
            res.json({ success: true, subscription });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    cancelSubscription = async (req, res) => {
        try {
            await this.subscriptionService.cancelSubscription(req.user.userId);
            res.json({ success: true, message: 'Abonnement annulé' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    createStripeSession = async (req, res) => {
        try {
            const { planId } = req.body;
            const url = await this.subscriptionService.createStripeSession(req.user.userId, planId);
            res.json({ success: true, url });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    runCronNow = async (req, res) => {
        try {
            const result = await this.subscriptionService.processExpiredSubscriptions();
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default SubscriptionController;
