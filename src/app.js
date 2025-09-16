import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orcamentosRoutes from './routes/orcamentos.js';

dotenv.config();
const app = express();

// CORS global
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'https://zero20garage.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS bloqueado: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Rotas
app.use('/api/orcamentos', orcamentosRoutes);

// Rota teste
app.get('/', (req, res) => res.json({ ok: true, msg: '🚀 API online com CORS habilitado' }));

export default app;
