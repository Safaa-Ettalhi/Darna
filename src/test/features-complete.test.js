import request from 'supertest';
import App from '../app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

describe('Tests Jest - Routes principales Darna', () => {
    let server;

    beforeAll(async () => {
        const app = new App();
        server = app.getApp();
    });

    describe('Leads & propriété', () => {
        test('Créer un lead - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/properties/123/leads')
                .send({ message: 'Intéressé' });

            expect(response.status).toBe(401);
        });

        test('Upload média propriété - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/properties/123/media');

            expect(response.status).toBe(401);
        });

        test('Suppression média propriété - nécessite authentification', async () => {
            const response = await request(server)
                .delete('/api/properties/123/media/456');

            expect(response.status).toBe(401);
        });
    });

    describe('Chat & notifications', () => {
        test('Liste des threads chat - nécessite authentification', async () => {
            const response = await request(server)
                .get('/api/chat/threads');

            expect(response.status).toBe(401);
        });

        test('Historique des messages - nécessite authentification', async () => {
            const response = await request(server)
                .get('/api/chat/threads/123/messages');

            expect(response.status).toBe(401);
        });

        test('Envoyer un message - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/chat/threads/123/messages')
                .send({ message: 'Bonjour' });

            expect(response.status).toBe(401);
        });

        test('Marquer un message comme lu - nécessite authentification', async () => {
            const response = await request(server)
                .patch('/api/chat/messages/123/read');

            expect(response.status).toBe(401);
        });
    });

    describe('Estimation & financement', () => {
        test('Estimation - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/estimation/calculate')
                .send({ surface: 80, rooms: 3 });

            expect(response.status).toBe(401);
        });

        test('Historique estimation - nécessite authentification', async () => {
            const response = await request(server)
                .get('/api/estimation/history');

            expect(response.status).toBe(401);
        });

        test('Création offre bancaire - nécessite authentification admin', async () => {
            const response = await request(server)
                .post('/api/financing/offers')
                .send({ name: 'Bank', rate: 3, durationYears: 20, maxAmount: 200000 });

            expect(response.status).toBe(401);
        });

        test('Simulation crédit - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/financing/simulate')
                .send({ amount: 180000, rate: 3.2, durationYears: 20 });

            expect(response.status).toBe(401);
        });

        test('Historique simulation - nécessite authentification', async () => {
            const response = await request(server)
                .get('/api/financing/simulate/history');

            expect(response.status).toBe(401);
        });

        test('Suggestion Tirelire - nécessite authentification', async () => {
            const response = await request(server)
                .post('/api/financing/simulate/tirelire')
                .send({ amount: 20000 });

            expect(response.status).toBe(401);
        });
    });

    describe('Administration', () => {
        test('Overview admin - nécessite rôle admin', async () => {
            const response = await request(server)
                .get('/api/admin/overview');

            expect(response.status).toBe(401);
        });

        test('Modération bien - nécessite rôle admin', async () => {
            const response = await request(server)
                .patch('/api/admin/properties/123/status')
                .send({ status: 'published' });

            expect(response.status).toBe(401);
        });

        test('Liste leads admin - nécessite rôle admin', async () => {
            const response = await request(server)
                .get('/api/admin/leads');

            expect(response.status).toBe(401);
        });
    });
});

