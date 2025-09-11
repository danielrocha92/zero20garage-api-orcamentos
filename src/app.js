// src/app.js
const express = require('express');
const cors = require('cors');

const orcamentoRoutes = require('./routes/orcamento');
const uploadRoutes = require('./routes/upload');

const app = express();

// ======== Configuração do CORS ========
const allowedOrigins = [
  'http://localhost:3000',               // front-end dev
  'https://zero20garage.vercel.app',     // front-end produção
];

const corsOptions = {
  origin: function (origin, callback) {
    // permitir requests sem origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `O CORS para este site não é permitido: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // permite cookies e headers de autorização
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Aplica CORS globalmente
app.use(cors(corsOptions));

// Permitir preflight requests para todas as rotas
app.options('*', cors(corsOptions));

// ======== Middleware ========
app.use(express.json());

// ======== Rotas ========
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/upload', uploadRoutes);

// Rota padrão para teste
app.get('/', (req, res) => {
  res.send('API da Zero20 Garage está online!');
});

module.exports = app;
