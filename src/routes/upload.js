// src/routes/upload.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { db } = require('../config/db');

const router = express.Router();

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuração do multer (upload em memória)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/upload/:id - upload de imagem para um orçamento
router.post('/:id', upload.single('image'), async (req, res) => {
  const orcamentoId = req.params.id;
  const file = req.file;
  const imageData = req.body.imageData; // para base64

  if (!file && !imageData) {
    return res.status(400).json({ error: 'Nenhum arquivo ou imagem base64 enviado.' });
  }

  try {
    // Transformar arquivo em base64 para Cloudinary
    let uploadResult;
    if (file) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      uploadResult = await cloudinary.uploader.upload(dataURI);
    } else if (imageData) {
      uploadResult = await cloudinary.uploader.upload(imageData);
    }

    const imageUrl = uploadResult.secure_url;

    // Salvar URL da imagem no Firestore
    const orcamentoRef = db.collection('orcamentos').doc(orcamentoId);
    const orcamentoDoc = await orcamentoRef.get();

    if (!orcamentoDoc.exists) {
      return res.status(404).json({ error: 'Orçamento não encontrado.' });
    }

    // Adiciona a imagem em um array 'imagens'
    await orcamentoRef.update({
      imagens: admin.firestore.FieldValue.arrayUnion(imageUrl),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ url: imageUrl, msg: 'Imagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao enviar a imagem.' });
  }
});

module.exports = router;
