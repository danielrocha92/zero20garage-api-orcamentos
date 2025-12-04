import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
  // Usar variáveis de ambiente (Produção / Seguro)
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
  console.log('✅ Firebase Admin SDK inicializado via variáveis de ambiente.');
} else if (fs.existsSync(serviceAccountPath)) {
  // Fallback para arquivo local (Desenvolvimento)
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  console.log('⚠️ Firebase Admin SDK inicializado via arquivo local (não recomendado para produção).');
} else {
  console.error('❌ Erro: Nenhuma credencial do Firebase encontrada (ENV ou Arquivo).');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();

export { db, admin };
