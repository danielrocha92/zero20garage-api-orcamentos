import 'dotenv/config';
import app from './app.js';
import { db } from './config/db.js';

const PORT = process.env.PORT || 10001;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}/api/orcamentos`);
});
