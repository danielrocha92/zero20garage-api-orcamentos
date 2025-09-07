const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado com sucesso.');
}

const db = admin.firestore();
module.exports = { db };
