// src/routes/orcamentos.js
import express from 'express';
import { db, admin } from '../config/db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary'; // Importado diretamente aqui
import { Readable } from 'stream';
// Importe o serviço que criamos
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

// O middleware CORS na rota específica pode ser removido se já estiver em app.js
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// ... (O restante das suas rotas CRUD, sem alterações) ...

// --- Upload de Imagem --- //
// Corrigido para upload.array() e para usar o serviço
router.post('/:id/imagens', upload.array('imagens'), async (req, res) => {
  const { id } = req.params;
 
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ msg: 'Nenhuma imagem enviada.' });
  }
 
  try {
    const uploadResults = [];
    for (const file of req.files) {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
     
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: `orcamentos/${id}` },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        bufferStream.pipe(uploadStream);
      });
     
      uploadResults.push({
        imagemUrl: result.secure_url,
        public_id: result.public_id
      });
    }
   
    // Chama a função do serviço para adicionar as imagens
    await updateOrcamentoWithImage(id, uploadResults);
   
    res.json({
      message: 'Uploads realizados com sucesso',
      imagens: uploadResults
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao enviar imagem' });
  }
});

// --- DELETAR Imagem --- //
// Corrigido para usar a função do serviço
router.delete('/:id/imagens/:public_id', async (req, res) => {
  const { id, public_id } = req.params;
 
  try {
    // Remove a imagem do Cloudinary
    await cloudinary.uploader.destroy(public_id);
    // Chama a função do serviço para remover a imagem do Firestore
    await updateOrcamentoWithImage(id, null, public_id);
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;