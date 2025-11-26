import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
    async _updateUserSubscription(userId, { plan, isActive, endDate }) {
        const update = {};
        if (plan !== undefined) update['subscription.plan'] = plan;
        if (isActive !== undefined) update['subscription.isActive'] = isActive;
        update['subscription.endDate'] = endDate ?? null;
        await User.findByIdAndUpdate(userId, { $set: update });
    }

    async createSubscription(userId, planId) {
        const plan = await Plan.findById(planId);
        if (!plan) throw new Error('Plan non trouvé');

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const subscription = await Subscription.create({
            user: userId,
            plan: planId,
            endDate
        });

        await this._updateUserSubscription(userId, {
            plan: plan.name,
            isActive: true,
            endDate
        });

        return subscription;
    }

    async getUserSubscription(userId) {
        return await Subscription.findOne({ user: userId, status: 'active' }).populate('plan');
    }

    async cancelSubscription(userId) {
        const result = await Subscription.findOneAndUpdate(
            { user: userId, status: 'active' },
            { status: 'cancelled' }
        );
        if (result) {
            await this._updateUserSubscription(userId, {
                plan: 'gratuit',
                isActive: false,
                endDate: null
            });
        }
        return result;
    }

    async changePlan(userId, newPlanId) {
        await this.cancelSubscription(userId);
        return await this.createSubscription(userId, newPlanId);
    }

    async createStripeSession(userId, planId) {
        const plan = await Plan.findById(planId);
        if (!plan) throw new Error('Plan non trouvé');

        const successUrl = `${process.env.CLIENT_URL}/profile?payment=success&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.CLIENT_URL}/profile?payment=cancel`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: { name: plan.name },
                        unit_amount: plan.price * 100,
                    },
                    quantity: 1,
                },
            ],
            customer_email: (await User.findById(userId)).email,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { userId: userId, planId: planId },
        });
        return session.url;
    }

    async processExpiredSubscriptions() {
        const now = new Date();
        const expiring = await Subscription.find({ status: 'active', endDate: { $lte: now } });
        for (const sub of expiring) {
            if (sub.autoRenew) {
                try {
                    const url = await this.createStripeSession(sub.user, sub.plan.toString());
                    sub.status = 'pending_renewal';
                    sub.renewalAttempts = (sub.renewalAttempts || 0) + 1;
                    sub.lastRenewalAt = new Date();
                    sub.lastRenewalError = undefined;
                    sub.renewalSessionUrl = url;
                    await sub.save();
                } catch (err) {
                    sub.status = 'expired';
                    sub.renewalAttempts = (sub.renewalAttempts || 0) + 1;
                    sub.lastRenewalAt = new Date();
                    sub.lastRenewalError = err.message;
                    await sub.save();
                }
            } else {
                sub.status = 'expired';
                await sub.save();
                await this._updateUserSubscription(sub.user, {
                    plan: 'gratuit',
                    isActive: false,
                    endDate: null
                });
            }
        }
        return { processed: expiring.length };
    }
}

export default SubscriptionService;
