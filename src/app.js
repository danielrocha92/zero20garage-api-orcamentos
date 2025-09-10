const express = require('express');
const cors = require('cors');

const orcamentoRoutes = require('./routes/orcamento');
const uploadRoutes = require('./routes/upload');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas só de orçamentos
app.use('/api/orcamentos', orcamentoRoutes);

// Rotas só de uploads
app.use('/api/upload', uploadRoutes);

// Rota padrão para teste de funcionamento
app.get('/', (req, res) => {
  res.send('API da Zero20 Garage está online!');
});

module.exports = app;
