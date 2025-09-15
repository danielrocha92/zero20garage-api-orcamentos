// src/routes/orcamentos.js
import express from 'express';
import { db, admin } from '../config/db.js';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

// ---------- CORS para preflight ---------- //
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*'); // ou use lista de allowedOrigins
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// ---------- CRUD ---------- //

// GET todos
router.get('/', async (req, res) => {
  try {
    const snapshot = await orcamentosCollection.orderBy('createdAt', 'desc').get();
    const orcamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orcamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter orçamentos' });
  }
});

// GET por ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await orcamentosCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// POST criar orçamento
router.post('/', async (req, res) => {
  const { cliente, tipo } = req.body;
  if (!cliente || !tipo) return res.status(400).json({ msg: 'Cliente e tipo são obrigatórios' });

  const novoOrcamentoData = {
    ...req.body,
    imagens: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const docRef = await orcamentosCollection.add(novoOrcamentoData);
    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar orçamento' });
  }
});

// PUT atualizar
router.put('/:id', async (req, res) => {
  try {
    const docRef = orcamentosCollection.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });

    const updatedData = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await docRef.update(updatedData);

    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar orçamento' });
  }
});

// DELETE orçamento
router.delete('/:id', async (req, res) => {
  try {
    const docRef = orcamentosCollection.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });

    // Opcional: deletar imagens no Cloudinary
    const imagens = doc.data().imagens || [];
    for (const img of imagens) {
      if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
    }

    await docRef.delete();
    res.json({ msg: 'Orçamento removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar orçamento' });
  }
});

// ---------- Upload de Imagem ---------- //

// POST upload de imagem
router.post('/:id/imagens', upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'Nenhuma imagem enviada' });
  const { id } = req.params;

  try {
    const docRef = orcamentosCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });

    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `orcamentos/${id}` },
      async (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ erro: 'Falha no upload da imagem' });
        }

        await updateOrcamentoWithImage(id, result.secure_url, result.public_id);
        res.json({ imagemUrl: result.secure_url, public_id: result.public_id });
      }
    );

    bufferStream.pipe(uploadStream);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao enviar imagem' });
  }
});

// DELETE imagem
router.delete('/:id/imagens/:public_id', async (req, res) => {
  const { id, public_id } = req.params;

  try {
    await cloudinary.uploader.destroy(public_id);
    await updateOrcamentoWithImage(id, null, public_id, true);
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;
