// orcamento-admin-zero20-api/server.js
// Ponto de entrada da aplicação. Inicia o servidor.

require('dotenv').config();

// Importa a configuração do Express de app.js
const app = require('./app');

// Importa a configuração de imagem upload da rota upload.js
const uploadRouter = require('./routes/upload'); // Caminho corrigido
app.use('/api', uploadRouter);

// Importa a instância do Firestore de config/db.js
const { db } = require('./config/db');

// Define a porta, usando a variável de ambiente ou 5000 como padrão
const PORT = process.env.PORT || 5000;

// Inicia o servidor Express.
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse a API em: http://localhost:${PORT}/api/orcamentos`);
});
