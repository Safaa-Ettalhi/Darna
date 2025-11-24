import Plan from '../models/Plan.js';

class PlanService {
    async getAllPlans() {
        let plans = await Plan.find({ isActive: true });
        
        if (plans.length === 0) {
            await this.createDefaultPlans();
            plans = await Plan.find({ isActive: true });
        }
        
        return plans;
    }

    async getPlanById(planId) {
        return await Plan.findById(planId);
    }

    async getPlanByName(name) {
        return await Plan.findOne({ name, isActive: true });
    }

    async createDefaultPlans() {
        const plans = [
            { name: 'gratuit', price: 0, duration: 'monthly', maxProperties: 10, priority: 1, features: ['basic'] },
            { name: 'pro', price: 29, duration: 'monthly', maxProperties: 30, priority: 2, features: ['basic', 'priority'] },
            { name: 'premium', price: 99, duration: 'monthly', maxProperties: -1, priority: 3, features: ['basic', 'priority', 'analytics'] }
        ];

        for (const planData of plans) {
            await Plan.findOneAndUpdate(
                { name: planData.name },
                planData,
                { upsert: true, new: true }
            );
        }
    }
}

export default PlanService;
