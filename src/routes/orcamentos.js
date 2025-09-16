import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { db } from '../config/firebaseAdmin.js';
import cloudinary from '../config/cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

// --- CRUD ---

// Listar orçamentos (paginação simples com limit)
router.get('/', async (req, res) => {
  try {
    const { page = 1, size = 10 } = req.query;
    const pageNumber = Math.max(parseInt(page), 1);
    const sizeNumber = Math.max(parseInt(size), 1);
    const offset = (pageNumber - 1) * sizeNumber;

    const snapshot = await orcamentosCollection.limit(sizeNumber).offset(offset).get();
    const orcamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orcamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar orçamentos' });
  }
});

// Obter orçamento por ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await orcamentosCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// Criar orçamento
router.post('/', async (req, res) => {
  try {
    const novoOrcamento = req.body;
    const docRef = await orcamentosCollection.add(novoOrcamento);
    res.status(201).json({ id: docRef.id, ...novoOrcamento });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar orçamento' });
  }
});

// Atualizar orçamento
router.put('/:id', async (req, res) => {
  try {
    await orcamentosCollection.doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar orçamento' });
  }
});

// Excluir orçamento
router.delete('/:id', async (req, res) => {
  try {
    await orcamentosCollection.doc(req.params.id).delete();
    res.json({ msg: 'Orçamento excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir orçamento' });
  }
});

// --- Upload de imagens ---
router.post('/:id/imagens', upload.array('imagens'), async (req, res) => {
  const { id } = req.params;
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ msg: 'Nenhuma imagem enviada.' });

  try {
    const uploadResults = [];
    for (const file of req.files) {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: `orcamentos/${id}` },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        bufferStream.pipe(uploadStream);
      });

      uploadResults.push({ imagemUrl: result.secure_url, public_id: result.public_id });
    }

    await updateOrcamentoWithImage(id, uploadResults);
    res.json({ message: 'Uploads realizados com sucesso', imagens: uploadResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao enviar imagem' });
  }
});

// --- Excluir imagem ---
router.delete('/:id/imagens/:public_id', async (req, res) => {
  const { id, public_id } = req.params;
  try {
    await cloudinary.uploader.destroy(public_id);
    await updateOrcamentoWithImage(id, null, public_id);
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;
