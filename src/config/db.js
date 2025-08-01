// orcamento-admin-zero20-api/src/config/db.js
const admin = require('firebase-admin');
const path = require('path'); // Módulo 'path' para lidar com caminhos de arquivo

// Caminho para o arquivo JSON da sua chave de serviço
// Certifique-se de que este caminho está correto em relação a este arquivo (db.js)
const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');

// Inicializa o Firebase Admin SDK
try {
  // Carrega o arquivo JSON da chave de serviço
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado com sucesso usando arquivo JSON.');
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
  // Se o erro for "initializeApp has already been called", ignore (pode acontecer em hot-reloads)
  if (!/already been called/.test(error.message)) {
    console.error(`Verifique se o arquivo ${serviceAccountPath} existe e está correto.`);
    process.exit(1); // Encerra o processo se houver um erro real de inicialização
  }
}

const db = admin.firestore(); // Obtém a instância do Firestore

module.exports = { db }; // Exporta a instância do Firestore