import AuthService from '../services/Auth.service.js';
import User from '../models/User.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    // Inscription
    register = async (req, res) => {
        try {
            const userData = req.body;
            const result = await this.authService.register(userData);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Connexion
    login = async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);
            
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({ success: false, message: error.message });
        }
    };

    // Rafraîchir token
    refreshToken = async (req, res) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refreshToken(refreshToken);
            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({ success: false, message: error.message });
        }
    };

    // Déconnexion
    logout = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.logout(userId);
            res.clearCookie('refreshToken');
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // Vérification email
    verifyEmail = async (req, res) => {
        try {
            const { token } = req.query;
            const result = await this.authService.verifyEmail(token);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Demande reset password
    requestPasswordReset = async (req, res) => {
        try {
            const { email } = req.body;
            const result = await this.authService.requestPasswordReset(email);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // Reset password
    resetPassword = async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            const result = await this.authService.resetPassword(token, newPassword);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Changer mot de passe
    changePassword = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { currentPassword, newPassword } = req.body;
            const result = await this.authService.changePassword(userId, currentPassword, newPassword);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Obtenir profil
    getProfile = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.getUserProfile(userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // Mettre à jour profil
    updateProfile = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const updateData = req.body;
            const result = await this.authService.updateUserProfile(userId, updateData);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Vérifier auth
    checkAuth = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.getUserProfile(userId);
            res.status(200).json({
                success: true,
                message: 'Authentifié',
                user: result.user
            });
        } catch (error) {
            res.status(401).json({ success: false, message: 'Non authentifié' });
        }
    };

    // ===== 2FA =====

    // Générer le setup 2FA
    generate2FASetup = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.generate2FASetup(userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Activer la 2FA
    enable2FA = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { token } = req.body;
            const result = await this.authService.enable2FA(userId, token);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Désactiver la 2FA
    disable2FA = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { password } = req.body;
            const result = await this.authService.disable2FA(userId, password);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Vérifier le code 2FA
    verify2FA = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { token } = req.body;
            const result = await this.authService.verify2FAForLogin(userId, token);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    // Obtenir le statut 2FA
    get2FAStatus = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.get2FAStatus(userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    exportData = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const data = await this.authService.exportUserData(userId);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    deleteAccount = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const result = await this.authService.deleteAccount(userId);
            res.clearCookie('refreshToken');
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // Ajouter un membre à une entreprise
    addMember = async (req, res) => {
        try {
            const { companyId, memberUserId, memberEmail } = req.body;
            const company = await User.findById(companyId);
            
            if (!company || company.accountType !== 'entreprise') {
                return res.status(400).json({ success: false, message: "Société introuvable ou invalide" });
            }

            // Chercher le membre par email ou ID
            let member;
            if (memberEmail) {
                member = await User.findOne({ email: memberEmail.toLowerCase().trim() });
                if (!member) {
                    return res.status(404).json({ success: false, message: "Aucun utilisateur trouvé avec cet email" });
                }
            } else if (memberUserId) {
                member = await User.findById(memberUserId);
            } else {
                return res.status(400).json({ success: false, message: "Email ou ID du membre requis" });
            }

            if (!member) {
                return res.status(404).json({ success: false, message: "Membre introuvable" });
            }

            // Vérifier que le membre n'est pas déjà dans l'équipe
            if (company.members.some(id => id.toString() === member._id.toString())) {
                return res.status(400).json({ success: false, message: "Ce membre fait déjà partie de votre équipe" });
            }

            // Vérifier que le membre n'est pas une entreprise
            if (member.accountType === 'entreprise') {
                return res.status(400).json({ success: false, message: "Impossible d'ajouter une entreprise comme membre" });
            }

            // Vérifier que le membre n'a pas déjà une entreprise parente
            if (member.parentCompany && member.parentCompany.toString() !== company._id.toString()) {
                return res.status(400).json({ success: false, message: "Cet utilisateur fait déjà partie d'une autre entreprise" });
            }

            member.parentCompany = company._id;
            await member.save();
            
            if (!company.members.includes(member._id)) {
                company.members.push(member._id);
                await company.save();
            }
            
            return res.json({ 
                success: true, 
                message: 'Membre ajouté à la société', 
                member: {
                    _id: member._id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    // Retirer un membre d'une entreprise
    removeMember = async (req, res) => {
        try {
            const { companyId, memberUserId } = req.body;
            const company = await User.findById(companyId);
            const member = await User.findById(memberUserId);
            if (!company || company.accountType !== 'entreprise') {
                return res.status(400).json({ success: false, message: "Société introuvable ou invalide" });
            }
            if (!member) {
                return res.status(400).json({ success: false, message: "Membre introuvable" });
            }
            company.members = company.members.filter(id => id.toString() !== member._id.toString());
            await company.save();
            member.parentCompany = null;
            await member.save();
            return res.json({ success: true, message: 'Membre retiré de la société', member });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

export default AuthController;