import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { db } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

// --- CRUD ---

// Listar orçamentos (paginação eficiente com cursor)
router.get('/', async (req, res) => {
  try {
    const { size = 10, lastId } = req.query;
    const sizeNumber = Math.max(parseInt(size), 1);

    let query = orcamentosCollection.orderBy('ordemServico', 'desc').limit(sizeNumber);

    if (lastId) {
      const lastDoc = await orcamentosCollection.doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    const orcamentos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        ordemServico: data.ordemServico || 0, // valor padrão
        imagens: Array.isArray(data.imagens) ? data.imagens : [], // garante array
        data: data.data?.toDate?.() || null, // converte timestamp
      };
    });

    const lastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;

    res.json({ orcamentos, lastDocId });
  } catch (err) {
    console.error('Erro ao buscar orçamentos:', err);
    res.status(500).json({ erro: err.message });
  }
});

// Obter orçamento por ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await orcamentosCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ erro: 'Orçamento não encontrado' });

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      imagens: Array.isArray(data.imagens) ? data.imagens : [],
      data: data.data?.toDate?.() || null,
    });
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
    await updateOrcamentoWithImage(id, { public_id_to_remove: public_id });
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;
