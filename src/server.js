// server.js (Versão com verificação de conexão)

require('dotenv').config();
const app = require('./app');
const { db } = require('./config/db');

const PORT = process.env.PORT || 10001;

async function startServer() {
    try {
        // Exemplo de verificação de conexão (fazendo uma requisição de teste)
        // Você pode ajustar isso para algo que faça sentido no seu projeto
        await db.collection('teste_conexao').doc('teste').get();
        console.log('Firebase Firestore conectado com sucesso!');

        // Inicia o servidor somente se a conexão com o banco de dados for bem-sucedida
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Acesse a API em: http://localhost:${PORT}/api/orcamentos`);
        });

    } catch (error) {
        console.error('Falha ao conectar com o Firebase Firestore:', error.message);
        console.error('Servidor não iniciado devido a erro de conexão com o banco de dados.');
        process.exit(1); // Encerra o processo com código de erro
    }
}

startServer();