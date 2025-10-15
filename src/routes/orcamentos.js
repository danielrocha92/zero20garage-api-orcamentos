import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { db, admin } from '../config/db.js';
import { Timestamp } from 'firebase-admin/firestore';
import cloudinary from '../config/cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

/**
 * Função transacional para obter o próximo número da OS
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

// ===============================
// 📦 CRUD de Orçamentos
// ===============================

// 🔹 Listar orçamentos com filtros e paginação
router.get('/', async (req, res) => {
  try {
    const { limit = 50, startAfter, search, tipo, data } = req.query;

    let orcamentosQuery = orcamentosCollection.orderBy('data', 'desc');

    // Filtro de busca simples por cliente
    if (search) {
      orcamentosQuery = orcamentosQuery.where('cliente', '==', search);
    }

    // Filtro por tipo de orçamento
    if (tipo) {
      orcamentosQuery = orcamentosQuery.where('tipo', '==', tipo);
    }

    // Filtro por data específica (dia inteiro)
    if (data) {
      const dataInicio = new Date(data);
      dataInicio.setUTCHours(0, 0, 0, 0);
      const dataFim = new Date(data);
      dataFim.setUTCHours(23, 59, 59, 999);

      orcamentosQuery = orcamentosQuery
        .where('data', '>=', Timestamp.fromDate(dataInicio))
        .where('data', '<=', Timestamp.fromDate(dataFim));
    }

    // Paginação por cursor
    if (startAfter) {
      const startAfterTimestamp = Timestamp.fromMillis(parseInt(startAfter, 10));
      orcamentosQuery = orcamentosQuery.startAfter(startAfterTimestamp);
    }

    orcamentosQuery = orcamentosQuery.limit(Number(limit));

    const snapshot = await orcamentosQuery.get();

    if (snapshot.empty) {
      return res.json({ orcamentos: [], nextCursor: null });
    }

    const orcamentos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        data: data.data?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.data().data?.toMillis?.() || null : null;

    res.json({ orcamentos, nextCursor });
  } catch (err) {
    console.error('❌ Erro ao buscar orçamentos:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// 🔹 Obter orçamento por ID
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
      createdAt: data.createdAt?.toDate?.() || data.data?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || data.data?.toDate?.() || null,
    });
  } catch (err) {
    console.error('❌ Erro ao obter orçamento:', err);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// 🔹 Criar novo orçamento
router.post('/', async (req, res) => {
  console.log('📥 Recebida requisição para criar orçamento:', req.body);
  try {
    const ordemServico = await getNextOrdemServico();
    console.log('🔢 Próxima Ordem de Serviço:', ordemServico);

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    const orcamentoParaSalvar = {
      ...req.body,
      status: req.body.status || 'Aberto',
      ordemServico,
      createdAt: serverTimestamp, // ✅ Restaurado
      data: serverTimestamp,
      updatedAt: serverTimestamp,
    };

    const docRef = await orcamentosCollection.add(orcamentoParaSalvar);

    console.log(`✅ Orçamento salvo com sucesso (ID: ${docRef.id})`);

    res.status(201).json({
      id: docRef.id,
      ...req.body,
      ordemServico,
      status: orcamentoParaSalvar.status,
      createdAt: new Date(), // compatível com exibição imediata no front
    });
  } catch (err) {
    console.error('❌ Erro ao criar orçamento:', err);
    res.status(500).json({ erro: 'Erro ao criar orçamento', detalhes: err.message });
  }
});

// 🔹 Atualizar orçamento existente
router.put('/:id', async (req, res) => {
  try {
    const dadosParaAtualizar = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orcamentosCollection.doc(req.params.id).update(dadosParaAtualizar);
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    console.error('❌ Erro ao atualizar orçamento:', err);
    res.status(500).json({ erro: 'Erro ao atualizar orçamento' });
  }
});

// 🔹 Excluir orçamento
router.delete('/:id', async (req, res) => {
  try {
    await orcamentosCollection.doc(req.params.id).delete();
    res.json({ msg: '🗑️ Orçamento excluído com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao excluir orçamento:', err);
    res.status(500).json({ erro: 'Erro ao excluir orçamento' });
  }
});

// ===============================
// 🖼️ Upload e Remoção de Imagens
// ===============================

// Upload de imagens para o orçamento
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
          (error, result) => (error ? reject(error) : resolve(result))
        );
        bufferStream.pipe(uploadStream);
      });

      uploadResults.push({ imageUrl: result.secure_url, public_id: result.public_id });
    }

    await updateOrcamentoWithImage(id, { newImages: uploadResults });

    res.json({ msg: '✅ Uploads realizados com sucesso', imagens: uploadResults });
  } catch (err) {
    console.error('❌ Erro ao enviar imagem:', err);
    res.status(500).json({ erro: 'Erro ao enviar imagem' });
  }
});

// Excluir imagem específica
router.delete('/:id/imagens/:public_id', async (req, res) => {
  const { id, public_id } = req.params;
  try {
    await cloudinary.uploader.destroy(public_id);
    await updateOrcamentoWithImage(id, { public_id_to_remove: public_id });
    res.json({ msg: '🗑️ Imagem removida com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao remover imagem:', err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;