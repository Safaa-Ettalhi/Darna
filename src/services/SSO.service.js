import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

class SSOService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    }

    // Configuration Google OAuth
    configurePassport() {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
        }, this.handleGoogleAuth.bind(this)));
    }

    // Gestion authentification Google
    async handleGoogleAuth(accessToken, refreshToken, profile, done) {
        try {
            const { id, emails, name } = profile;
            const email = emails[0].value;

            let user = await User.findOne({ 
                $or: [{ email }, { 'sso.googleId': id }]
            });

            if (!user) {
                user = new User({
                    email,
                    firstName: name.givenName,
                    lastName: name.familyName,
                    sso: { googleId: id, provider: 'google' },
                    emailVerified: true,
                    accountType: 'particulier',
                    role: 'particulier'
                });
                await user.save();
            }

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }

    // Générer token JWT
    generateToken(user) {
        return jwt.sign({
            userId: user._id,
            email: user.email,
            role: user.role,
            accountType: user.accountType
        }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    }

    // Routes Google
    authenticateGoogle() {
        return passport.authenticate('google', { scope: ['profile', 'email'] });
    }

    authenticateGoogleCallback() {
        return passport.authenticate('google', { failureRedirect: '/login?error=sso_failed' });
    }

    // Réponse succès
    handleSSOSuccess(req, res) {
        try {
            const user = req.user;
            const token = this.generateToken(user);
            
            res.status(200).json({
                success: true,
                message: 'Connexion Google réussie',
                token
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la connexion Google'
            });
        }
    }
}

export default SSOService;
