import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class TwoFactorService {
    generateSecret(userEmail) {
        const secret = speakeasy.generateSecret({
            name: userEmail,
            issuer: 'Darna',
            length: 32
        });

        return {
            secret: secret.base32,
            qrCodeUrl: secret.otpauth_url
        };
    }
    async generateQRCode(secret, userEmail) {
        try {
            const qrCodeUrl = `otpauth://totp/Darna:${userEmail}?secret=${secret}&issuer=Darna`;
            const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl);
            return qrCodeDataURL;
        } catch (error) {
            throw new Error(`Erreur QR Code: ${error.message}`);
        }
    }
    verifyToken(secret, token) {
        try {
            return speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 2
            });
        } catch (error) {
            return false;
        }
    }

    generateBackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            codes.push(code);
        }
        return codes;
    }
    verifyBackupCode(backupCodes, usedCodes, code) {
        return backupCodes.includes(code) && !usedCodes.includes(code);
    }
}

export default TwoFactorService;