import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    // Initialiser le transporteur email
    initializeTransporter() {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.log('⚠️ Email configuration not found. Email features will be disabled.');
                this.transporter = null;
                return;
            }

            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: { rejectUnauthorized: false }
            });

            console.log('✅ Email transporter initialized');
        } catch (error) {
            console.error('❌ Email transporter initialization error:', error);
            this.transporter = null;
        }
    }

    // Envoyer email de vérification
    async sendVerificationEmail(email, token) {
        try {
            if (!this.transporter) {
                console.log(`⚠️ Email transporter not configured. Verification email would be sent to: ${email}`);
                return;
            }

            const verificationUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;
            
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@darna.com',
                to: email,
                subject: 'Vérifiez votre compte Darna',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Bienvenue sur Darna !</h2>
                        <p>Merci de vous être inscrit sur notre plateforme immobilière.</p>
                        <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Vérifier mon compte
                            </a>
                        </div>
                        <p>Ce lien expire dans 24 heures.</p>
                        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px;">
                            Darna - Plateforme immobilière intelligente
                        </p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Verification email sent to ${email}`);
            
        } catch (error) {
            console.error(`❌ Error sending verification email to ${email}:`, error);
            throw new Error('Erreur lors de l\'envoi de l\'email de vérification');
        }
    }

    // Envoyer email de réinitialisation de mot de passe
    async sendPasswordResetEmail(email, token) {
        try {
            if (!this.transporter) {
                console.log(`⚠️ Email transporter not configured. Password reset email would be sent to: ${email}`);
                return;
            }

            const resetUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/reset-password?token=${token}`;
            
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@darna.com',
                to: email,
                subject: 'Réinitialisation de votre mot de passe Darna',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
                        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #dc2626; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Réinitialiser mon mot de passe
                            </a>
                        </div>
                        <p>Ce lien expire dans 1 heure.</p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px;">
                            Darna - Plateforme immobilière intelligente
                        </p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${email}`);
            
        } catch (error) {
            console.error(`❌ Error sending password reset email to ${email}:`, error);
            throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
        }
    }

    // Envoyer email de notification
    async sendNotificationEmail(email, subject, message, type = 'info') {
        try {
            const colors = {
                info: '#2563eb',
                success: '#16a34a',
                warning: '#d97706',
                error: '#dc2626'
            };

            const color = colors[type] || colors.info;
            
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@darna.com',
                to: email,
                subject: `Darna - ${subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: ${color};">${subject}</h2>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            ${message}
                        </div>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px;">
                            Darna - Plateforme immobilière intelligente
                        </p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Notification email sent to ${email}`);
            
        } catch (error) {
            console.error(`❌ Error sending notification email to ${email}:`, error);
            throw new Error('Erreur lors de l\'envoi de la notification');
        }
    }

    // Vérifier la connexion
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email transporter connection verified');
            return true;
        } catch (error) {
            console.error('❌ Email transporter connection failed:', error);
            return false;
        }
    }
}

export default EmailService;