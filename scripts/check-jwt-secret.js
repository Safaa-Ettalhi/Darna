/**
 * Script pour afficher le JWT_SECRET utilisé par Darna
 * Usage: node scripts/check-jwt-secret.js
 * 
 * ⚠️ ATTENTION: Ce script affiche le secret JWT. Ne le partage pas publiquement !
 */

require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;

console.log('\n🔐 JWT_SECRET de Darna\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!jwtSecret) {
    console.error('❌ JWT_SECRET n\'est pas défini dans le .env');
    console.log('\n📝 Action requise:');
    console.log('   1. Ouvre le fichier .env du backend Darna');
    console.log('   2. Ajoute: JWT_SECRET=ton-secret-ici');
    console.log('   3. Redémarre le serveur Darna\n');
    process.exit(1);
}

console.log('✅ JWT_SECRET trouvé !\n');
console.log('📋 Valeur à copier dans Tirelire:\n');
console.log(`   ${jwtSecret}\n`);
console.log(`   Longueur: ${jwtSecret.length} caractères\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📝 Instructions:');
console.log('   1. Copie la valeur ci-dessus');
console.log('   2. Ouvre le fichier .env de Tirelire');
console.log('   3. Ajoute ou modifie: DARNA_JWT_SECRET=<valeur-copiée>');
console.log('   4. Assure-toi qu\'il n\'y a pas d\'espaces avant/après');
console.log('   5. Redémarre le serveur Tirelire\n');

