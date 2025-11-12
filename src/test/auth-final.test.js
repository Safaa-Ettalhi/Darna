import request from 'supertest';
import App from '../app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

describe(' Tests Jest - Système d\'Authentification ESSENTIEL', () => {
    let server;

    beforeAll(async () => {
        const app = new App();
        server = app.getApp();
    });

    describe(' Authentification de base', () => {
        test('Register - Inscription', async () => {
            const response = await request(server)
                .post('/api/auth/register')
                .send({});

            expect(response.status).toBe(400);
        });

        test('Login - Connexion', async () => {
            const response = await request(server)
                .post('/api/auth/login')
                .send({});

            expect(response.status).toBe(400);
        });

        test('Logout - Déconnexion', async () => {
            const response = await request(server)
                .post('/api/auth/logout');

            expect(response.status).not.toBe(404);
        });

        test('Refresh Token - Renouveler token', async () => {
            const response = await request(server)
                .post('/api/auth/refresh-token');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' Gestion des mots de passe', () => {
        test('Request Password Reset - Demander reset', async () => {
            const response = await request(server)
                .post('/api/auth/request-password-reset');

            expect(response.status).not.toBe(404);
        });

        test('Reset Password - Réinitialiser mot de passe', async () => {
            const response = await request(server)
                .post('/api/auth/reset-password');

            expect(response.status).not.toBe(404);
        });

        test('Change Password - Changer mot de passe', async () => {
            const response = await request(server)
                .post('/api/auth/change-password');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' Vérification email', () => {
        test('Verify Email - Vérifier email', async () => {
            const response = await request(server)
                .post('/api/auth/verify-email');
            expect([200, 400, 404]).toContain(response.status);
        });
    });

    describe(' Profil utilisateur', () => {
        test('Get Profile - Obtenir profil', async () => {
            const response = await request(server)
                .get('/api/auth/profile');

            expect(response.status).toBe(401);
        });

        test('Update Profile - Mettre à jour profil', async () => {
            const response = await request(server)
                .put('/api/auth/profile');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' RGPD', () => {
        test('Export Data - Exporter données', async () => {
            const response = await request(server)
                .get('/api/auth/export');

            expect(response.status).toBe(401);
        });

        test('Delete Account - Supprimer compte', async () => {
            const response = await request(server)
                .delete('/api/auth/account');

            expect(response.status).toBe(401);
        });
    });

    describe(' Vérification authentification', () => {
        test('Check Auth - Vérifier authentification', async () => {
            const response = await request(server)
                .get('/api/auth/check');

            expect(response.status).not.toBe(404);
        });

        test('Get Me - Obtenir mes infos', async () => {
            const response = await request(server)
                .get('/api/auth/me');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' 2FA - Authentification à deux facteurs', () => {
        test('2FA Status - Vérifier le statut 2FA', async () => {
            const response = await request(server)
                .get('/api/auth/2fa/status');

            expect(response.status).not.toBe(404);
        });

        test('2FA Setup - Générer le setup 2FA', async () => {
            const response = await request(server)
                .post('/api/auth/2fa/setup');

            expect(response.status).not.toBe(404);
        });

        test('2FA Enable - Activer avec le code de l\'app', async () => {
            const response = await request(server)
                .post('/api/auth/2fa/enable');

            expect(response.status).not.toBe(404);
        });

        test('2FA Disable - Désactiver la 2FA', async () => {
            const response = await request(server)
                .post('/api/auth/2fa/disable');

            expect(response.status).not.toBe(404);
        });

        test('2FA Verify - Vérifier code 2FA', async () => {
            const response = await request(server)
                .post('/api/auth/2fa/verify');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' SSO Google', () => {
        test('Google SSO - Test Google', async () => {
            const response = await request(server)
                .get('/api/auth/google');

            expect(response.status).toBe(302);
        });
    });
});
