import App from './src/app.js';

const app = new App();

app.start().then(() => {
    console.log('Serveur complètement démarré et prêt !');
}).catch((error) => {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
});
