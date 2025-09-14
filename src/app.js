import express from 'express';
import cors from 'cors';
import orcamentosRoutes from './routes/orcamentos.js';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://zero20garage.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) return callback(new Error('CORS não permitido'), false);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use('/api/orcamentos', orcamentosRoutes);

app.get('/', (req, res) => res.send('API Zero20 Garage online!'));

export default app;
