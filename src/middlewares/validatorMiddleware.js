import Joi from 'joi';

// Middleware de validation simple
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }
        
        req.body = value;
        next();
    };
};

// Middleware de validation des paramètres
export const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres invalides'
            });
        }
        
        req.params = value;
        next();
    };
};

// Middleware de validation des query
export const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres de requête invalides'
            });
        }
        
        req.query = value;
        next();
    };
};

// Middleware de pagination simple
export const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    
    req.pagination = {
        page: Math.max(page, 1),
        limit,
        skip: (page - 1) * limit
    };
    
    next();
};