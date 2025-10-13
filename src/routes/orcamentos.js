import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { db, admin } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

/**
 * Função para obter o próximo número da Ordem de Serviço.
 */
const getNextOrdemServico = async () => {
  const counterRef = db.collection('counters').doc('orcamentos');
  const result = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const newOrdemServico = (counterDoc.data()?.current || 0) + 1;
    transaction.set(counterRef, { current: newOrdemServico });
    return newOrdemServico;
  });
  return result;
};

// --- CRUD ---

// Listar orçamentos (paginação eficiente com cursor)
router.get('/', async (req, res) => {
  try {
    // Removida a paginação para buscar todos os orçamentos.
    const query = orcamentosCollection.orderBy('ordemServico', 'desc');

    const snapshot = await query.get();

    const orcamentos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        ordemServico: data.ordemServico || 0, // valor padrão
        imagens: Array.isArray(data.imagens) ? data.imagens : [], // garante array
        data: data.data?.toDate?.() || null, // converte timestamp
        updatedAt: data.updatedAt?.toDate?.() || data.data?.toDate?.() || null, // converte timestamp de atualização, sem sobrescrever 'data'
      };
    });

    // Retorna um array simples de orçamentos, sem o objeto de paginação.
    res.json(orcamentos);
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
      updatedAt: data.updatedAt?.toDate?.() || data.data?.toDate?.() || null, // Correção para não sobrescrever 'data'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// Criar orçamento
router.post('/', async (req, res) => {
  try {
    const ordemServico = await getNextOrdemServico();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    const orcamentoParaSalvar = {
      ...req.body,
      status: req.body.status || 'Aberto', // Garante um status padrão
      ordemServico,
      data: serverTimestamp,
      updatedAt: serverTimestamp,
    };

    const docRef = await orcamentosCollection.add(orcamentoParaSalvar);
    // Retorna o objeto com o ID, mas sem os FieldValue sentinels
    res.status(201).json({ id: docRef.id, ...req.body, ordemServico, status: orcamentoParaSalvar.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar orçamento' });
  }
});

// Atualizar orçamento
router.put('/:id', async (req, res) => {
  try {
    const dadosParaAtualizar = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orcamentosCollection.doc(req.params.id).update(dadosParaAtualizar);
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

    for (const result of uploadResults) {
      await updateOrcamentoWithImage(id, { imageUrl: result.imagemUrl, public_id: result.public_id });
    }
    res.json({ msg: 'Uploads realizados com sucesso', imagens: uploadResults });
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
    await updateOrcamentoWithImage(id, { public_id, remove: true });
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;
