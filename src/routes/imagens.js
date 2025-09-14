// src/routes/imagens.js
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../db.js'; // seu Firestore
import streamifier from 'streamifier';

const router = express.Router();

// Configuração do Multer (em memória)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Endpoint para upload de imagem
router.post('/:id', upload.single('imagem'), async (req, res) => {
  const { id } = req.params;

  console.log('-----------------------------');
  console.log('Recebendo upload de imagem');
  console.log('Orcamento ID:', id);
  console.log('Arquivo recebido:', req.file ? req.file.originalname : 'Nenhum arquivo recebido');

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  try {
    // Upload para Cloudinary via buffer
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'orcamentos' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    console.log('URL da imagem no Cloudinary:', result.secure_url);

    // Atualizar documento do Firestore
    const docRef = db.collection('orcamentos').doc(id); // ⚠️ garanta que a collection está sem acento
    await docRef.update({
      imagemUrl: result.secure_url,
      updatedAt: new Date(),
    });

    res.status(200).json({
      message: 'Upload realizado com sucesso!',
      imagemUrl: result.secure_url,
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem.' });
  }
});

export default router;
