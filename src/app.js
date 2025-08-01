// orcamento-admin-zero20-api/src/app.js
// Configuração principal do Express e middlewares.

const express = require('express');
const cors = require('cors'); // Importa o pacote cors
const orcamentoRoutes = require('./routes/orcamento'); // Importa as rotas de orçamento

const app = express();

// Middlewares
// Configuração do CORS para permitir origens específicas.
// Em produção, substitua 'http://localhost:3000' pela URL do seu frontend em produção.
const corsOptions = {
  origin: ['http://localhost:3000', '[https://seu-frontend-em-producao.onrender.com](https://seu-frontend-em-producao.onrender.com)'], // Adicione a URL do seu frontend no Render aqui!
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos permitidos
};
app.use(cors(corsOptions)); // Aplica o middleware CORS com as opções configuradas

// Habilita o parsing de JSON para o corpo das requisições.
app.use(express.json());

// Rotas da API
app.use('/api/orcamentos', orcamentoRoutes);

// Rota de teste simples para a raiz da API
app.get('/', (req, res) => {
  res.send('API de Orçamento Admin Zero20 Garage está funcionando! Acesse /api/orcamentos para interagir com os dados.');
});

module.exports = app;