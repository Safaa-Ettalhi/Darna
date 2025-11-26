import User from '../models/User.js';

class ProfileController {
    async updateProfile(req, res) {
        try {
            const allowedFields = ['firstName', 'lastName', 'phone', 'accountType'];
            const payload = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    payload[field] = req.body[field];
                }
            }

            if (!Object.keys(payload).length) {
                return res.status(400).json({ success: false, message: 'Aucune donnée fournie.' });
            }

            const user = await User.findByIdAndUpdate(req.user.userId, payload, { new: true }).lean();
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
            }

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateCompanyInfo(req, res) {
        try {
            const companyPayload = {
                companyInfo: {
                    companyName: req.body.companyName,
                    siret: req.body.siret,
                    address: {
                        street: req.body.street,
                        city: req.body.city,
                        postalCode: req.body.postalCode,
                        country: req.body.country,
                    },
                },
            };

            const user = await User.findByIdAndUpdate(req.user.userId, companyPayload, { new: true }).lean();
            if (!user) {
                return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
            }

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new ProfileController();

