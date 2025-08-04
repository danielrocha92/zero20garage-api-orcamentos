// orcamento-admin-zero20-api/server.js
// Ponto de entrada da aplicação. Inicia o servidor.

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa a configuração do Express de src/app.js
const app = require('./app');

// Importa a instância do Firestore de src/config/db.js
const { db } = require('./src/config/db'); // Certifique-se de que este caminho está correto para o seu projeto

// Define a porta, usando a variável de ambiente ou 5000 como padrão
const PORT = process.env.PORT || 5000;

// Inicia o servidor Express. A conexão com o Firebase é feita na inicialização do 'db.js'.
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse a API em: http://localhost:${PORT}/api/orcamentos`);
  // Opcional: Verifique se o Firestore está acessível (pode ser feito com uma query simples)
  // db.collection('orcamentos').limit(1).get().then(() => {
  //   console.log('Conexão com Firestore verificada com sucesso.');
  // }).catch(err => {
  //   console.error('Falha ao verificar conexão com Firestore:', err);
  // });
});
