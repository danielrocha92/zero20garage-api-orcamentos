const express = require('express');
const cors = require('cors');

const orcamentoRoutes = require('./routes/orcamento');
const uploadRoutes = require('./routes/upload');

const app = express();

// --- Configuração CORS ---
const allowedOrigins = [
  'http://localhost:3000', // frontend dev
  'https://api-orcamento-n49u.onrender.com' // frontend produção
];

const corsOptions = {
  origin: function(origin, callback) {
    // permitir requests sem origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `O CORS para este site não é permitido: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // permite cookies, authorization headers
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Permitir preflight requests para todas as rotas
app.options('*', cors(corsOptions));

// Middleware para parse de JSON
app.use(express.json());

// Rotas de orçamentos
app.use('/api/orcamentos', orcamentoRoutes);

// Rotas de uploads
app.use('/api/upload', uploadRoutes);

// Rota padrão para teste
app.get('/', (req, res) => {
  res.send('API da Zero20 Garage está online!');
});

module.exports = app;
