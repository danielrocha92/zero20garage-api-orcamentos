// orcamento-admin-zero20-api/src/config/db.js
// Configuração da inicialização do Firebase Admin SDK e exportação do Firestore.

const admin = require('firebase-admin');

// Tenta obter o JSON completo da conta de serviço da variável de ambiente
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let serviceAccount = undefined;

// Verifica se a variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON foi lida corretamente
console.log(`Verificando FIREBASE_SERVICE_ACCOUNT_JSON. Tamanho: ${serviceAccountJsonString ? serviceAccountJsonString.length : 'não definida'}`);

if (serviceAccountJsonString) {
  // Loga uma parte da string JSON para confirmar que não está vazia (sem dados sensíveis)
  console.log(`FIREBASE_SERVICE_ACCOUNT_JSON lida (início): ${serviceAccountJsonString.substring(0, 50)}...`);

  try {
    // Limpeza da string para garantir que caracteres problemáticos sejam removidos
    let cleanedJsonString = serviceAccountJsonString
      .split('\r').join('')  // Remove todos os retornos de carro
      .split('\n').join('')  // Remove todas as novas linhas
      .split('\u00A0').join('')  // Remove todos os espaços não-quebráveis
      .split('\uFEFF').join('')  // Remove todos os BOM
      .trim();  // Remove quaisquer espaços extras no começo e no fim

    // Tenta parsear a string JSON limpa
    serviceAccount = JSON.parse(cleanedJsonString);
    console.log('Conta de serviço parseada com sucesso.');

  } catch (parseError) {
    console.error('ERRO: Falha ao parsear FIREBASE_SERVICE_ACCOUNT_JSON. Verifique a formatação JSON:', parseError.message);
    process.exit(1); // Sai do processo se o parseamento falhar
  }
} else {
  console.error('ERRO: FIREBASE_SERVICE_ACCOUNT_JSON não está definida nas variáveis de ambiente.');
  console.error('Por favor, defina a variável FIREBASE_SERVICE_ACCOUNT_JSON com o valor JSON stringificado da sua conta de serviço.');
  process.exit(1); // Sai do processo se a variável não estiver definida
}

// Verificação dos campos obrigatórios no objeto serviceAccount
console.log('Verificando os campos obrigatórios no objeto serviceAccount...');
if (!serviceAccount || !serviceAccount.project_id) {
  console.error('ERRO: project_id não está definido ou está vazio no objeto serviceAccount.');
  process.exit(1);
}
if (!serviceAccount.private_key) {
  console.error('ERRO: private_key não está definida no objeto serviceAccount.');
  process.exit(1);
}
if (!serviceAccount.client_email) {
  console.error('ERRO: client_email não está definido no objeto serviceAccount.');
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
