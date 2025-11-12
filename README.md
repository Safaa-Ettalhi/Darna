# 🏠 Darna - Plateforme Intelligente d'Annonces Immobilières

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

## 📋 Description

**Darna** est une plateforme web moderne et intelligente de gestion d'annonces immobilières, conçue pour les particuliers et les entreprises (agences, promoteurs). La solution intègre des fonctionnalités avancées de chat temps réel, d'estimation de prix intelligente, et de gestion complète des biens immobiliers.

## ✨ Fonctionnalités Principales

### 🏘️ Gestion des Biens Immobiliers
- **Publication complète** : vente, location journalière, mensuelle, longue durée
- **Métadonnées détaillées** : localisation, caractéristiques, équipements, diagnostics
- **Géolocalisation** : coordonnées GPS et adresses complètes
- **Médias** : images et vidéos avec génération automatique de vignettes

### 👥 Comptes et Abonnements
- **Profils différenciés** : Particulier, Entreprise (Agence/Promoteur)
- **Plans d'abonnement** : Gratuit, Pro, Premium
- **Visibilité prioritaire** selon le plan d'abonnement
- **Multi-utilisateurs** pour les entreprises

### 💬 Communication Temps Réel & Leads
- **Chat WebSocket** intégré avec Socket.IO
- **Notifications instantanées** (in-app et email)
- **Statut de présence** et indicateurs de lecture
- **Pièces jointes** (images, documents)
- **Génération automatique de leads** lors des manifestations d’intérêt
- **Threads de discussion dédiés** par lead avec modération d’accès

### 🤖 Intelligence Artificielle
- **Estimation de prix automatique** basée sur LLM
- **Analyse des caractéristiques** du bien
- **Recommandations personnalisées**

### 🔍 Recherche et Filtrage Avancés
- **Recherche multi-critères** : localisation, prix, surface, équipements, disponibilité
- **Algorithme de priorité** d'affichage
- **Tri intelligent** : pertinence, priorité, récence, prix
- **Prise en compte de la priorité d’abonnement** et du scoring de performance

### 🏦 Options de Financement
- **Banques partenaires** avec taux indicatifs
- **Simulateur de crédit immobilier** (calcul des mensualités, intérêts globaux)
- **Historique des simulations** côté utilisateur
- **Suggestion Tirelire** (Daret l Darna) pour la constitution collaborative d’apport

### 🤖 Estimation de prix intelligente
- **Heuristique avancée** exploitant caractéristiques du bien
- **Intégration LLM (OpenAI) optionnelle** pour générer une analyse détaillée
- **Historique d’estimations** par utilisateur

### 🛡️ Espace Administrateur & Conformité
- **Modération des annonces** avec notifications propriétaires
- **Tableau de bord** utilisateurs / propriétés / leads / abonnements
- **Gestion des plans** et offre bancaire
- **Export RGPD** et suppression complète de compte utilisateur

## 🏗️ Architecture Technique

### Stack Technologique
- **Backend** : Node.js avec Express 5.x
- **Base de données** : MongoDB avec Mongoose ODM
- **Authentification** : JWT + Keycloak SSO
- **Stockage média** : MinIO
- **Temps réel** : Socket.IO
- **Tests** : Jest
- **Containerisation** : Docker
- **CI/CD** : GitHub Actions

### Architecture N-Tiers
```
├── Controllers/     # Logique métier
├── Models/         # Modèles de données
├── Services/       # Services métier
├── Routes/         # Définition des routes
├── Middlewares/    # Middlewares personnalisés
├── Utils/          # Utilitaires
└── Config/         # Configuration
```

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- MongoDB 7+
- MinIO Server
- Keycloak Server

### Installation
```bash
# Cloner le repository
git clone https://github.com/Mahdi732/Darna-
cd Darna-

# Installer les dépendances
npm install

# Configuration des variables d'environnement
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

### Variables d'Environnement
```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/darna

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
Un exemple complet est disponible dans `docs/env.example`.

### Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm start

# Tests
npm test

# Tests avec couverture
npm run test:coverage
```

## 🐳 Docker

### Construction et Lancement
```bash
# Construction de l'image
docker build -t darna-api .

# Lancement avec Docker Compose
docker-compose up -d

# Vérification des logs
docker-compose logs -f
```

## 📊 API Documentation

### Endpoints Principaux

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Renouvellement token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/export` - Export RGPD des données utilisateur
- `DELETE /api/auth/account` - Suppression complète du compte

#### Biens Immobiliers
- `GET /api/properties` - Liste des biens
- `POST /api/properties` - Création d'un bien
- `GET /api/properties/:id` - Détails d'un bien
- `PUT /api/properties/:id` - Modification d'un bien
- `DELETE /api/properties/:id` - Suppression d'un bien
- `POST /api/properties/:id/media` - Upload médias (MinIO + vignettes)
- `DELETE /api/properties/:id/media/:mediaId` - Suppression d'un média
- `POST /api/properties/:id/leads` - Création d'un lead

#### Chat et Messagerie
- `GET /api/chat/threads` - Liste des conversations de l'utilisateur
- `GET /api/chat/threads/:id` - Détails d'un thread (participants, bien)
- `GET /api/chat/threads/:id/messages` - Historique des messages (pagination possible)
- `POST /api/chat/threads/:id/messages` - Envoi d'un message texte
- `PATCH /api/chat/messages/:messageId/read` - Marquer un message comme lu

#### Estimation de Prix
- `POST /api/estimation/calculate` - Calcul d'estimation
- `GET /api/estimation/history` - Historique des estimations

#### Leads
- `GET /api/leads/me/buyer` - Leads où l’utilisateur est acheteur
- `GET /api/leads/me/owner` - Leads reçus sur ses biens
- `PATCH /api/leads/:leadId/status` - Mise à jour du statut d’un lead

#### Financement
- `GET /api/financing/offers` - Liste des offres bancaires partenaires
- `POST /api/financing/offers` - Création d’une offre (admin)
- `POST /api/financing/simulate` - Simulation de crédit
- `GET /api/financing/simulate/history` - Historique des simulations
- `POST /api/financing/simulate/tirelire` - Suggestion d’épargne collective

#### Administration
- `GET /api/admin/overview` - Indicateurs globaux
- `GET /api/admin/properties/pending` - Biens en attente de modération
- `PATCH /api/admin/properties/:propertyId/status` - Validation / rejet d’un bien
- `GET /api/admin/leads` - Liste des leads de la plateforme

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests end-to-end
npm run test:e2e

# Couverture de code
npm run test:coverage
```

## 🔧 Scripts Disponibles

```bash
npm start          # Démarrage en production
npm run dev        # Démarrage en développement
npm test           # Exécution des tests
npm run lint       # Vérification du code
npm run build      # Construction du projet
npm run docker     # Construction Docker
```

## 📈 Monitoring et Performance

- **PM2** pour la gestion des processus
- **Logs structurés** avec Winston
- **Métriques** avec Prometheus
- **Health checks** intégrés

## 🔒 Sécurité

- **Authentification JWT** avec refresh tokens
- **Validation des données** côté backend
- **Protection CORS** configurée
- **Rate limiting** implémenté
- **Chiffrement** des mots de passe avec bcrypt
- **Conformité RGPD** intégrée

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request


## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

- **Développement** : Équipe Darna
- **Architecture** : Solutions scalables
- **DevOps** : CI/CD et déploiement


