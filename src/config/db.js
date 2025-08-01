// orcamento-admin-zero20-api/src/config/db.js
// Configuração da inicialização do Firebase Admin SDK e exportação do Firestore.

const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined, // Importante: substituir '\n' por quebras de linha reais
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Verificação adicional para depuração de credenciais
if (!serviceAccount.projectId) {
  console.error('ERRO: FIREBASE_PROJECT_ID não está definido nas variáveis de ambiente.');
  process.exit(1); // Encerra o processo se a variável crítica estiver faltando
}
if (!serviceAccount.privateKey) {
  console.error('ERRO: FIREBASE_PRIVATE_KEY não está definida nas variáveis de ambiente ou está vazia.');
  console.error('Verifique se a variável FIREBASE_PRIVATE_KEY no Render está configurada corretamente, incluindo a substituição de quebras de linha por \\n.');
  process.exit(1); // Encerra o processo se a variável crítica estiver faltando
}
if (!serviceAccount.clientEmail) {
  console.error('ERRO: FIREBASE_CLIENT_EMAIL não está definido nas variáveis de ambiente.');
  process.exit(1); // Encerra o processo se a variável crítica estiver faltando
}

// Inicializa o Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado com sucesso.');
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
  // Se o erro for "initializeApp has already been called", ignore (pode acontecer em hot-reloads em desenvolvimento)
  if (!/already been called/.test(error.message)) {
    process.exit(1); // Encerra o processo se houver um erro real de inicialização
  }
}

const db = admin.firestore(); // Obtém a instância do Firestore

module.exports = { db }; // Exporta a instância do Firestore
