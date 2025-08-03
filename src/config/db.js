// orcamento-admin-zero20-api/src/config/db.js
// Configuração da inicialização do Firebase Admin SDK e exportação do Firestore.

const admin = require('firebase-admin');

// Tenta obter a chave privada da variável de ambiente Base64
const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
let privateKey = undefined;

// Adiciona log para verificar se a variável de ambiente está sendo lida
console.log(`Verificando FIREBASE_PRIVATE_KEY_BASE64. Tamanho: ${privateKeyBase64 ? privateKeyBase64.length : 'não definida'}`);
if (privateKeyBase64) {
  // Loga uma parte da chave para confirmar que não está vazia, mas truncada por segurança
  console.log(`FIREBASE_PRIVATE_KEY_BASE64 lida (início): ${privateKeyBase64.substring(0, 50)}...`);
  try {
    // Decodifica a chave privada de Base64
    privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
    console.log('Chave privada decodificada de Base64 com sucesso.');
  } catch (decodeError) {
    console.error('ERRO: Falha ao decodificar FIREBASE_PRIVATE_KEY_BASE64. Verifique a formatação Base64:', decodeError.message);
    process.exit(1); // Sai do processo se a decodificação falhar
  }
} else {
  console.error('ERRO: FIREBASE_PRIVATE_KEY_BASE64 não está definida nas variáveis de ambiente.');
  console.error('Por favor, defina a variável FIREBASE_PRIVATE_KEY_BASE64 no Render com o valor Base64 da sua chave privada.');
  process.exit(1); // Sai do processo se a variável não estiver definida
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: privateKey, // Usa a chave decodificada
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Verificação adicional para depuração de credenciais
if (!serviceAccount.projectId) {
  console.error('ERRO: FIREBASE_PROJECT_ID não está definido nas variáveis de ambiente.');
  process.exit(1);
}
if (!serviceAccount.privateKey) {
  // Esta verificação agora é redundante se o bloco 'if (privateKeyBase64)' acima funcionar corretamente,
  // mas é mantida como um fallback de segurança.
  console.error('ERRO: serviceAccount.privateKey está vazia após a tentativa de decodificação.');
  console.error('Isso pode indicar um problema na variável de ambiente FIREBASE_PRIVATE_KEY_BASE64 ou na decodificação.');
  process.exit(1);
}
if (!serviceAccount.clientEmail) {
  console.error('ERRO: FIREBASE_CLIENT_EMAIL não está definido nas variáveis de ambiente.');
  process.exit(1);
}

// Inicializa o Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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
