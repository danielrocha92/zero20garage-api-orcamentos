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
  // Loga os códigos ASCII dos primeiros caracteres da string bruta para depuração
  console.log('Raw string char codes (first 10):', Array.from(serviceAccountJsonString.substring(0, 10)).map(char => char.charCodeAt(0)));

  try {
    // --- PASSO CRÍTICO: Limpa a string de caracteres problemáticos antes de parsear ---
    // Remove explicitamente caracteres de retorno de carro (\r), nova linha (\n),
    // o espaço não-quebrável (\u00A0) e o Byte Order Mark (\uFEFF)
    // usando split().join('') para garantir a remoção de todas as ocorrências.
    let cleanedJsonString = serviceAccountJsonString;
    cleanedJsonString = cleanedJsonString.split('\r').join(''); // Remove todos os retornos de carro
    cleanedJsonString = cleanedJsonString.split('\n').join(''); // Remove todas as novas linhas
    cleanedJsonString = cleanedJsonString.split('\u00A0').join(''); // Remove todos os espaços não-quebráveis
    cleanedJsonString = cleanedJsonString.split('\uFEFF').join(''); // Remove todos os BOM
    cleanedJsonString = cleanedJsonString.trim(); // Remove quaisquer espaços em branco (incluindo tabs) do início e do fim

    console.log(`FIREBASE_SERVICE_ACCOUNT_JSON limpa (início): ${cleanedJsonString.substring(0, 50)}...`);
    // Loga os códigos ASCII dos primeiros caracteres da string limpa para depuração
    console.log('Cleaned string char codes (first 10):', Array.from(cleanedJsonString.substring(0, 10)).map(char => char.charCodeAt(0)));

    // Tenta parsear a string JSON limpa
    serviceAccount = JSON.parse(cleanedJsonString);
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
console.log('Verificando os campos obrigatórios no objeto serviceAccount...');
console.log('Primeiras propriedades do objeto:', serviceAccount);  // Mostrando as primeiras propriedades

if (!serviceAccount || !serviceAccount.projectId || serviceAccount.projectId.trim() === "") {
  console.error('ERRO: projectId não está definido ou está vazio no objeto serviceAccount.');
  process.exit(1); // Sai do processo se o projectId não estiver presente ou estiver vazio
}

if (!serviceAccount.privateKey) {
  console.error('ERRO: privateKey não está definida no objeto serviceAccount.');
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
