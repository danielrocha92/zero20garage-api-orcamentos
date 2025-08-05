const admin = require('firebase-admin');
const path = require('path');

// Caminho para o arquivo JSON
const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
    process.exit(1);
  }
} else {
  console.log('Firebase Admin SDK já estava inicializado.');
}

const db = admin.firestore();

module.exports = { db };
