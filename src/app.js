import express from "express";
import http from "http";
import { Chat } from "./socket/chat.socket.js";
import { NotificationSocket } from "./socket/notification.socket.js";
import { Server } from "socket.io";
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import dbConfig from './config/db.js';
import authRoutes from './routes/authRoute.js';
import subscriptionRoutes from './routes/subscriptionRoute.js';
import profileRoutes from './routes/profileRoute.js';
import propertyRoutes from './routes/propertyRoute.js';
import leadRoutes from './routes/leadRoute.js';
import adminRoutes from './routes/adminRoute.js';
import financingRoutes from './routes/financingRoute.js';
import estimationRoutes from './routes/estimationRoute.js';
import chatRoutes from './routes/chatRoute.js';

dotenv.config();

class App {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 5000;
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
}

// Socket.io will be initialized when the server starts
// Configuration des middlewares
    setupMiddlewares() {
        this.app.use(cors({
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true
        }));
        
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Sessions pour Passport
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'darna-session-secret',
            resave: false,
            saveUninitialized: false
        }));
        
        // Passport
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        
        // Sérialisation Passport
        passport.serializeUser((user, done) => done(null, user._id));
        passport.deserializeUser(async (id, done) => {
            try {
                const User = (await import('./models/User.js')).default;
                const user = await User.findById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });
        
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    // Configuration des routes
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ success: true, message: 'Darna API is running' });
        });

        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/subscriptions', subscriptionRoutes);
        this.app.use('/api/profile', profileRoutes);
        this.app.use('/api/properties', propertyRoutes);
        this.app.use('/api/leads', leadRoutes);
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/financing', financingRoutes);
        this.app.use('/api/estimation', estimationRoutes);
        this.app.use('/api/chat', chatRoutes);

        this.app.get('/abo/success', (req, res) => {
            res.send(`
                <h1>Paiement Stripe réussi !</h1>
                <p>Merci pour votre achat. Votre abonnement sera activé sous peu.</p>
                <code>Session Stripe : ${req.query.session_id || '-'} </code>
            `);
        });
        this.app.get('/abo/cancel', (req, res) => {
            res.send(`
                <h1>Paiement annulé</h1>
                <p>Vous n'avez pas finalisé votre achat.</p>
            `);
        });

        this.app.use((req, res) => {
            res.status(404).json({ success: false, message: 'Route non trouvée' });
        });
    }

    // Gestion des erreurs
    setupErrorHandling() {
        this.app.use((error, req, res, next) => {
            console.error('Error:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Erreur de validation',
                    errors: Object.values(error.errors).map(err => ({
                        field: err.path,
                        message: err.message
                    }))
                });
            }

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Données déjà utilisées'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token invalide'
                });
            }

            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Erreur interne du serveur'
                

            });
        });
    }

    // Démarrer le serveur
    async start() {
        try {
            await dbConfig.connect();
            
            // create HTTP server and attach Socket.IO
            const server = http.createServer(this.app);
            const io = new Server(server, {
                cors: {
                    origin: process.env.CLIENT_URL || 'http://localhost:3000',
                    credentials: true
                }
            });
            this.app.set("io", io);
            const chatSocket = new Chat(io);
            chatSocket.init();
            const notifSocket = new NotificationSocket(io);
            notifSocket.init();

            server.listen(this.port, () => {
                console.log(`Serveur démarré sur le port ${this.port}`);
                console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
                console.log(`URL: http://localhost:${this.port}`);
            });
            const { default: SubscriptionService } = await import('./services/SubscriptionService.js');
            const subService = new SubscriptionService();
            const runJob = async () => {
                try {
                    const result = await subService.processExpiredSubscriptions();
                    if (result?.processed >= 0) {
                        console.log(`[SubscriptionsJob] processed=${result.processed} @ ${new Date().toISOString()}`);
                    }
                } catch (e) {
                    console.error('[SubscriptionsJob] error:', e.message);
                }
            };
            runJob();
            setInterval(runJob, 60 * 60 * 1000);
           

        } catch (error) {
            console.error('Erreur démarrage:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        console.log(' Arrêt du serveur...');
        try {
            await dbConfig.disconnect();
            console.log(' Serveur arrêté');
            process.exit(0);
        } catch (error) {
            console.error(' Erreur arrêt:', error);
            process.exit(1);
        }
    }



    getApp() {
        return this.app;
    }
}

export default App;