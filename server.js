// orcamento-admin-zero20-api/server.js
// Ponto de entrada da aplicação. Inicia o servidor.

require('dotenv').config(); 

// Importa a configuração do Express de app.js
const app = require('./src/app'); // <-- REVERTA PARA ESTE CAMINHO

// Importa a instância do Firestore de config/db.js
const { db } = require('./src/config/db'); // <-- REVERTA PARA ESTE CAMINHO

// Define a porta
const PORT = process.env.PORT || 5000; 

// Inicia o servidor Express.
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse a API em: http://localhost:${PORT}/api/orcamentos`);
});
