import request from 'supertest';
import App from '../app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

describe(' Tests Jest - Système d\'abonnements ESSENTIEL', () => {
    let server;

    beforeAll(async () => {
        const app = new App();
        server = app.getApp();
    });

    describe(' Plans', () => {
        test('Voir un plan spécifique', async () => {
            const response = await request(server)
                .get('/api/subscriptions/plans/123');

            expect(response.status).not.toBe(404);
        });
    });

    describe(' Abonnements', () => {
        test('S\'abonner (protégé)', async () => {
            const response = await request(server)
                .post('/api/subscriptions/subscribe');

            expect(response.status).toBe(401);
        });

        test('Voir mon abonnement (protégé)', async () => {
            const response = await request(server)
                .get('/api/subscriptions/my-subscription');

            expect(response.status).toBe(401);
        });

        test('Annuler abonnement (protégé)', async () => {
            const response = await request(server)
                .delete('/api/subscriptions/cancel');

            expect(response.status).toBe(401);
        });
    });
});
