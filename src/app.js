// orcamento-admin-zero20-api/src/app.js
// Configuração principal do Express e middlewares.

const express = require('express');
const cors = require('cors');
const orcamentoRoutes = require('./routes/orcamento'); // Importa as rotas de orçamento

const app = express();

// Middlewares
app.use(cors()); // Habilita o CORS para todas as requisições (ajuste para origens específicas em produção)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// Rotas da API
app.use('/api/orcamentos', orcamentoRoutes); // Prefixo para as rotas de orçamento

// Rota de teste simples para a raiz da API
app.get('/', (req, res) => {
  res.send('API de Orçamento Admin Zero20 Garage está funcionando! Acesse /api/orcamentos');
});

module.exports = app; // Exporta a instância do Express