import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import EmailService from './EmailService.js';
import TwoFactorService from './TwoFactorService.js';
import Property from '../models/Property.js';
import Lead from '../models/Lead.js';
import LoanSimulation from '../models/LoanSimulation.js';
import Estimation from '../models/Estimation.js';
import Subscription from '../models/Subscription.js';

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
        this.emailService = new EmailService();
        this.twoFactorService = new TwoFactorService();
        
        if (!this.jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
    }

    // Générer token JWT
    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    }

    // Générer refresh token
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiresIn });
    }

    // Vérifier token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Token invalide ou expiré');
        }
    }

    // Générer token aléatoire
    generateRandomToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Inscription
    async register(userData) {
        try {
            const { email, password, firstName, lastName, phone, accountType, companyInfo } = userData;
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('Un utilisateur avec cet email existe déjà');
            }
            const emailVerificationToken = this.generateRandomToken();
            const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

            const user = new User({
                email,
                password,
                firstName,
                lastName,
                phone,
                accountType,
                companyInfo,
                emailVerificationToken,
                emailVerificationExpires,
                role: accountType === 'entreprise' ? 'entreprise' : 'particulier'
            });

            await user.save();
            try {
                await this.emailService.sendVerificationEmail(email, emailVerificationToken);
            } catch (emailError) {
                console.warn(' Email verification service error:', emailError.message);
            }

            return {
                success: true,
                message: 'Compte créé avec succès.',
                user: user.toSafeObject()
            };

        } catch (error) {
            throw new Error(`Erreur lors de l'inscription: ${error.message}`);
        }
    }

    // Connexion
    async login(email, password) {
        try {
            const user = await User.findOne({ email }).select('+password');
            
            if (!user) {
                throw new Error('Email ou mot de passe incorrect');
            }
            if (!user.isActive) {
                throw new Error('Votre compte a été désactivé');
            }

            if (user.isBlocked) {
                throw new Error(`Votre compte a été bloqué: ${user.blockedReason}`);
            }
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new Error('Email ou mot de passe incorrect');
            }
            if (!user.emailVerified) {
                throw new Error('Veuillez vérifier votre email avant de vous connecter');
            }
            user.stats.lastLogin = new Date();
            user.stats.loginCount += 1;
            await user.save();

            const tokenPayload = {
                userId: user._id,
                name: user.firstName + " " + user.lastName,
                email: user.email,
                role: user.role,
                accountType: user.accountType
            };

            const token = this.generateToken(tokenPayload);
            const refreshToken = this.generateRefreshToken(tokenPayload);

            return {
                success: true,
                message: 'Connexion réussie',
                token,
                refreshToken,
                user: user.toSafeObject()
            };

        } catch (error) {
            throw new Error(`Erreur lors de la connexion: ${error.message}`);
        }
    }

    // Rafraîchir token
    async refreshToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken);
            const user = await User.findById(decoded.userId);
            
            if (!user || !user.isActive) {
                throw new Error('Utilisateur non trouvé ou inactif');
            }

            const tokenPayload = {
                userId: user._id,
                email: user.email,
                role: user.role,
                accountType: user.accountType
            };

            const newToken = this.generateToken(tokenPayload);

            return {
                success: true,
                token: newToken,
                user: user.toSafeObject()
            };

        } catch (error) {
            throw new Error(`Erreur lors du rafraîchissement: ${error.message}`);
        }
    }

    // Vérification d'email
    async verifyEmail(token) {
        try {
            const user = await User.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Token de vérification invalide ou expiré');
            }

            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();

            return {
                success: true,
                message: 'Email vérifié avec succès'
            };

        } catch (error) {
            throw new Error(`Erreur lors de la vérification: ${error.message}`);
        }
    }

    // Demande de réinitialisation de mot de passe
    async requestPasswordReset(email) {
        try {
            const user = await User.findOne({ email });
            
            if (!user) {
                return {
                    success: true,
                    message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
                };
            }

            const resetToken = this.generateRandomToken();
            user.passwordResetToken = resetToken;
            user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
            await user.save();
            try {
                await this.emailService.sendPasswordResetEmail(email, resetToken);
            } catch (emailError) {
                console.warn('Email reset disabled for development:', emailError.message);
            }

            return {
                success: true,
                message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
            };

        } catch (error) {
            throw new Error(`Erreur lors de la demande: ${error.message}`);
        }
    }

    // Réinitialisation de mot de passe
    async resetPassword(token, newPassword) {
        try {
            const user = await User.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Token de réinitialisation invalide ou expiré');
            }

            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();

            return {
                success: true,
                message: 'Mot de passe réinitialisé avec succès'
            };

        } catch (error) {
            throw new Error(`Erreur lors de la réinitialisation: ${error.message}`);
        }
    }

    // Changement de mot de passe
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId).select('+password');
            
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                throw new Error('Mot de passe actuel incorrect');
            }

            user.password = newPassword;
            await user.save();

            return {
                success: true,
                message: 'Mot de passe modifié avec succès'
            };

        } catch (error) {
            throw new Error(`Erreur lors du changement: ${error.message}`);
        }
    }

    // Déconnexion
    async logout(userId) {
        try {
            return {
                success: true,
                message: 'Déconnexion réussie'
            };
        } catch (error) {
            throw new Error(`Erreur lors de la déconnexion: ${error.message}`);
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await User.findById(userId);
            
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            return {
                success: true,
                user: user.toSafeObject()
            };

        } catch (error) {
            throw new Error(`Erreur lors de la récupération: ${error.message}`);
        }
    }

    // Mettre à jour le profil utilisateur
    async updateUserProfile(userId, updateData) {
        try {
            const user = await User.findById(userId);
            
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }
            const allowedFields = ['firstName', 'lastName', 'phone', 'preferences', 'companyInfo'];
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    user[field] = updateData[field];
                }
            });

            await user.save();

            return {
                success: true,
                message: 'Profil mis à jour avec succès',
                user: user.toSafeObject()
            };

        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
        }
    }

    // ===== 2FA =====

    async generate2FASetup(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');
            if (user.twoFactorEnabled) throw new Error('La 2FA est déjà activée');

            const { secret } = this.twoFactorService.generateSecret(user.email);
            const qrCodeDataURL = await this.twoFactorService.generateQRCode(secret, user.email);
            const backupCodes = this.twoFactorService.generateBackupCodes();

            user.twoFactorSecret = secret;
            user.twoFactorBackupCodes = backupCodes;
            await user.save();

            return {
                success: true,
                secret,
                qrCodeDataURL,
                backupCodes,
                message: 'Scannez le QR Code avec Google Authenticator'
            };

        } catch (error) {
            throw new Error(`Erreur setup 2FA: ${error.message}`);
        }
    }

    // Activer la 2FA
    async enable2FA(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');
            if (user.twoFactorEnabled) throw new Error('La 2FA est déjà activée');

            const isValidToken = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
            if (!isValidToken) {
                const isValidBackupCode = this.twoFactorService.verifyBackupCode(
                    user.twoFactorBackupCodes || [],
                    user.twoFactorBackupCodesUsed || [],
                    token
                );
                if (!isValidBackupCode) {
                    throw new Error('Code invalide - utilisez le code de votre application d\'authentification ou un code de sauvegarde');
                }
            }

            user.twoFactorEnabled = true;
            await user.save();

            return {
                success: true,
                message: '2FA activée avec succès',
                backupCodes: user.twoFactorBackupCodes
            };

        } catch (error) {
            throw new Error(`Erreur activation 2FA: ${error.message}`);
        }
    }

    // Désactiver la 2FA
    async disable2FA(userId, password) {
        try {
            const user = await User.findById(userId).select('+password');
            if (!user) throw new Error('Utilisateur non trouvé');
            if (!user.twoFactorEnabled) throw new Error('La 2FA n\'est pas activée');

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) throw new Error('Mot de passe incorrect');
            user.twoFactorEnabled = false;
            user.twoFactorSecret = undefined;
            user.twoFactorBackupCodes = [];
            user.twoFactorBackupCodesUsed = [];
            await user.save();

            return {
                success: true,
                message: '2FA désactivée avec succès'
            };

        } catch (error) {
            throw new Error(`Erreur désactivation 2FA: ${error.message}`);
        }
    }

    // Vérifier le code 2FA
    async verify2FAForLogin(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');
            if (!user.twoFactorEnabled) throw new Error('La 2FA n\'est pas activée');
            const isValidToken = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
            if (isValidToken) {
                return { success: true, message: 'Code 2FA vérifié' };
            }
            const isValidBackupCode = this.twoFactorService.verifyBackupCode(
                user.twoFactorBackupCodes,
                user.twoFactorBackupCodesUsed,
                token
            );

            if (isValidBackupCode) {
                user.twoFactorBackupCodesUsed.push(token);
                await user.save();
                return { success: true, message: 'Code de sauvegarde utilisé' };
            }

            throw new Error('Code invalide');

        } catch (error) {
            throw new Error(`Erreur vérification 2FA: ${error.message}`);
        }
    }

    // Obtenir le statut 2FA
    async get2FAStatus(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');

            return {
                success: true,
                twoFactorEnabled: user.twoFactorEnabled,
                backupCodesCount: user.twoFactorBackupCodes?.length || 0
            };

        } catch (error) {
            throw new Error(`Erreur statut 2FA: ${error.message}`);
        }
    }

    async exportUserData(userId) {
        try {
            const user = await User.findById(userId).lean();
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            const [properties, leadsAsBuyer, leadsAsOwner, simulations, estimations, subscriptions] = await Promise.all([
                Property.find({ ownerId: userId }).lean(),
                Lead.find({ buyer: userId }).populate('property', 'title price').lean(),
                Lead.find({ owner: userId }).populate('property', 'title price').lean(),
                LoanSimulation.find({ user: userId }).lean(),
                Estimation.find({ user: userId }).lean(),
                Subscription.find({ user: userId }).populate('plan').lean(),
            ]);

            return {
                user,
                properties,
                leads: {
                    asBuyer: leadsAsBuyer,
                    asOwner: leadsAsOwner,
                },
                simulations,
                estimations,
                subscriptions,
            };
        } catch (error) {
            throw new Error(`Erreur export des données: ${error.message}`);
        }
    }

    async deleteAccount(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            await Promise.all([
                Property.deleteMany({ ownerId: userId }),
                Lead.deleteMany({ $or: [{ buyer: userId }, { owner: userId }] }),
                LoanSimulation.deleteMany({ user: userId }),
                Estimation.deleteMany({ user: userId }),
                Subscription.deleteMany({ user: userId }),
                User.updateMany({ members: userId }, { $pull: { members: userId } }),
            ]);

            await User.findByIdAndDelete(userId);

            return {
                success: true,
                message: 'Compte et données associées supprimés conformément à la RGPD',
            };
        } catch (error) {
            throw new Error(`Erreur suppression du compte: ${error.message}`);
        }
    }
}

export default AuthService;