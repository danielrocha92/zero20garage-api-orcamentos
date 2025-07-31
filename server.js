// orcamento-admin-zero20-api/server.js
// Ponto de entrada da aplicação. Inicia o servidor.

require('dotenv').config(); 

// Importa a configuração do Express de app.js (agora na mesma pasta que server.js no deploy)
const app = require('./app'); 

// Importa a instância do Firestore de config/db.js (agora na mesma pasta que server.js no deploy)
const { db } = require('./config/db'); 

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
