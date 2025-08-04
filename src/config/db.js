// orcamento-admin-zero20-api/src/config/db.js
// Configuração da inicialização do Firebase Admin SDK e exportação do Firestore.

const admin = require('firebase-admin');

// Tenta obter o JSON completo da conta de serviço da variável de ambiente
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let serviceAccount = undefined;

// Adiciona log para verificar se a variável de ambiente está sendo lida
console.log(`Verificando FIREBASE_SERVICE_ACCOUNT_JSON. Tamanho: ${serviceAccountJsonString ? serviceAccountJsonString.length : 'não definida'}`);

if (serviceAccountJsonString) {
  // Loga uma parte da string JSON para confirmar que não está vazia, mas truncada por segurança
  console.log(`FIREBASE_SERVICE_ACCOUNT_JSON lida (início): ${serviceAccountJsonString.substring(0, 50)}...`);
  try {
    // Parseia a string JSON de volta para um objeto
    serviceAccount = JSON.parse(serviceAccountJsonString);
    console.log('Objeto de conta de serviço parseado de JSON com sucesso.');
  } catch (parseError) {
    console.error('ERRO: Falha ao parsear FIREBASE_SERVICE_ACCOUNT_JSON. Verifique a formatação JSON:', parseError.message);
    process.exit(1); // Sai do processo se o parseamento falhar
  }
} else {
  console.error('ERRO: FIREBASE_SERVICE_ACCOUNT_JSON não está definida nas variáveis de ambiente.');
  console.error('Por favor, defina a variável FIREBASE_SERVICE_ACCOUNT_JSON no Render com o valor JSON stringificado da sua conta de serviço.');
  process.exit(1); // Sai do processo se a variável não estiver definida
}

// Verificação adicional para depuração de credenciais (usando o objeto serviceAccount parseado)
if (!serviceAccount || !serviceAccount.projectId) {
  console.error('ERRO: projectId não está definido no objeto serviceAccount.');
  process.exit(1);
}
if (!serviceAccount.privateKey) {
  console.error('ERRO: privateKey não está definida no objeto serviceAccount.');
  console.error('Isso pode indicar um problema na variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON ou no parseamento.');
  process.exit(1);
}
if (!serviceAccount.clientEmail) {
  console.error('ERRO: clientEmail não está definido no objeto serviceAccount.');
  process.exit(1);
}

// Inicializa o Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount), // Passa o objeto serviceAccount diretamente
  });
  console.log('Firebase Admin SDK inicializado com sucesso.');
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
  // Garante que o processo só saia se não for o erro de "já inicializado"
  if (!/already been called/.test(error.message)) {
    process.exit(1);
  }
}

const db = admin.firestore();

module.exports = { db };
