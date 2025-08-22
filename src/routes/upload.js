// src/routes/upload.js ou em server.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // use a sua configuração importada
const router = express.Router();

// Configuração do multer para manusear o upload em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    // Obtenha a imagem do FormData (upload de arquivo) ou do corpo da requisição (câmera)
    const file = req.file;
    const imageData = req.body.imageData;

    let uploadResult;

    if (file) {
        // Upload de arquivo
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = 'data:' + file.mimetype + ';base64,' + b64;
        uploadResult = await cloudinary.uploader.upload(dataURI);
    } else if (imageData) {
        // Upload de base64 (câmera)
        uploadResult = await cloudinary.uploader.upload(imageData);
    } else {
        return res.status(400).json({ error: 'Nenhum arquivo ou dado de imagem recebido.' });
    }

    // Retorne a URL segura da imagem para o frontend
    res.status(200).json({ url: uploadResult.secure_url });

  } catch (error) {
    console.error('Erro no upload para o Cloudinary:', error);
    res.status(500).json({ error: 'Erro ao fazer o upload da imagem.' });
  }
});

module.exports = router;