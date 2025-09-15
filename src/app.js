// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orcamentosRoutes from './routes/orcamentos.js';

dotenv.config();

const app = express();

// ===== CORS =====
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'https://zero20garage.vercel.app',
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // permite Postman e chamadas internas
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`❌ CORS bloqueado para origem: ${origin}`);
    return callback(new Error(`CORS bloqueado: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ✅ aplica CORS globalmente
app.use(cors(corsOptions));

// ✅ middleware para tratar preflight OPTIONS corretamente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Middleware global
app.use(express.json());

// Rotas
app.use('/api/orcamentos', orcamentosRoutes);

// Rota teste
app.get('/', (req, res) =>
  res.json({ ok: true, msg: '🚀 Upload API online com CORS habilitado' })
);

export default app;
