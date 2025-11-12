import Property from "../models/Property.js";

const verifyOwnership = async (req, res, next) => {
    try {
        const propertyId = req.params.id;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const property = await Property.findById(propertyId);

        if (!property) {
            return res.status(404).json({ error: 'property not found' });
        }

        if (property.ownerId.toString() !== userId) {
            return res.status(403).json({ error: 'you do not have permission to modify this property' });
        }

        req.property = property;
        next();
    } catch (error) {
        console.error('error verifying ownership', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

export default verifyOwnership;