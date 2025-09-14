import express from 'express';
import cors from 'cors';
import orcamentosRoutes from './routes/orcamentos.js';

const app = express();

// ===== CORS =====
const allowedOrigins = [
  'http://localhost:3000',
  'https://zero20garage.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) return callback(new Error(`CORS bloqueado: ${origin}`), false);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Rotas
app.use('/api/orcamentos', orcamentosRoutes);

// Rota teste
app.get('/', (req, res) => res.send('API Zero20 Garage Online!'));

export default app;
