// src/server.js
require('dotenv').config();

console.log('1. Importando o app...');
const app = require('./app');
console.log('2. App importado com sucesso.');

// Importa a instância do Firestore de config/db.js
console.log('3. Importando a conexão com o banco de dados...');
const { db } = require('./config/db');
console.log('4. Conexão com o banco de dados importada com sucesso.');

// Define a porta
const PORT = process.env.PORT || 10001;

// Inicia o servidor Express.
console.log('5. Tentando iniciar o servidor na porta', PORT);
app.listen(PORT, () => {
  // Esta parte só é executada quando o servidor está "ouvindo"
  console.log('6. Servidor Express iniciado com sucesso!');
  console.log(`Acesse a API em: http://localhost:${PORT}/api/orcamentos`);
});

// Qualquer código que venha após app.listen() é o que pode estar finalizando a aplicação
// Verifique se há algo aqui que está causando o erro.