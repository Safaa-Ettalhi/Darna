import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware d'authentification simple
export const authenticateToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token requis'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé ou inactif'
            });
        }
        
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            accountType: decoded.accountType
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalide'
        });
    }
};

// Middleware de vérification des rôles
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes'
            });
        }
        next();
    };
};

// Middleware de vérification du type de compte
export const requireAccountType = (...accountTypes) => {
    return (req, res, next) => {
        if (!req.user || !accountTypes.includes(req.user.accountType)) {
            return res.status(403).json({
                success: false,
                message: 'Type de compte non autorisé'
            });
        }
        next();
    };
};

// Middleware optionnel d'authentification
export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                    accountType: decoded.accountType
                };
            }
        }
        
        next();
    } catch (error) {
        next();
    }
};