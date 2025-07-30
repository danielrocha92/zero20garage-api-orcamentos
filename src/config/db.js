// src/config/db.js
const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Adicione estes logs para depurar as variáveis
console.log('DEBUG: serviceAccount.projectId:', serviceAccount.projectId);
console.log('DEBUG: serviceAccount.clientEmail:', serviceAccount.clientEmail);
// CUIDADO: NÃO LOGUE A CHAVE PRIVADA COMPLETA EM AMBIENTES DE PRODUÇÃO!
// console.log('DEBUG: serviceAccount.privateKey (first 50 chars):', serviceAccount.privateKey ? serviceAccount.privateKey.substring(0, 50) : 'N/A');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado com sucesso.');
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
  if (!/already been called/.test(error.message)) {
    process.exit(1);
  }
}

const db = admin.firestore();
module.exports = { db };