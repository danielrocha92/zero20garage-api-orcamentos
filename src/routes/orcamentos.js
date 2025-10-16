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

// 🔹 Criar novo orçamento (VERSÃO CORRIGIDA)
router.post('/', async (req, res) => {
  console.log('📥 Recebida requisição para criar orçamento:', req.body);
  try {
    const { ordemServico } = req.body;

    if (!ordemServico) {
      return res.status(400).json({ erro: 'O número da Ordem de Serviço (ordemServico) é obrigatório.' });
    }

    const osText = String(ordemServico); // Garante que o ID seja uma string

    // MUDANÇA 1: A verificação de duplicata agora é feita diretamente pelo ID
    const docRef = orcamentosCollection.doc(osText);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return res.status(409).json({ erro: `A Ordem de Serviço ${osText} já existe.` });
    }

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    const orcamentoParaSalvar = {
      ...req.body,
      ordemServico: osText, // Garante que o campo 'ordemServico' seja salvo no documento
      status: req.body.status || 'Aberto',
      createdAt: serverTimestamp,
      data: serverTimestamp,
      updatedAt: serverTimestamp,
    };

    // MUDANÇA 2: Usamos .set() em vez de .add() para criar o documento com o ID específico
    await docRef.set(orcamentoParaSalvar);
    console.log(`✅ Orçamento salvo com sucesso (ID: ${osText})`);

    res.status(201).json({
      id: osText, // O ID agora é a própria Ordem de Serviço
      ...orcamentoParaSalvar,
      createdAt: new Date(),
      data: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('❌ Erro ao criar orçamento:', err);
    res.status(500).json({ erro: 'Erro ao criar orçamento', detalhes: err.message });
  }
});


// 🔹 Atualizar orçamento existente
router.put('/:id', async (req, res) => {
  try {
    const docRef = orcamentosCollection.doc(req.params.id);
    // eslint-disable-next-line no-unused-vars
    const dadosDoBody = req.body;

    const dadosParaAtualizar = {
      ...dadosDoBody,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Garante que a data vinda do frontend (string) seja convertida para Timestamp
      // O replace é um ajuste para fusos horários, tratando a data como local.
      data: dadosDoBody.data ? Timestamp.fromDate(new Date(dadosDoBody.data.replace(/-/g, '/'))) : null,
    };

    await docRef.update(dadosParaAtualizar);

    // Busca o documento atualizado para retornar o objeto completo
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    // Retorna o orçamento completo e atualizado, convertendo Timestamps
    res.json({
      id: updatedDoc.id,
      ...data,
      data: data.data?.toDate?.() || null,
      createdAt: data.createdAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || new Date(), // Retorna a data atual como fallback
    });
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

    // Itera sobre os resultados e atualiza o documento para cada imagem
    for (const img of uploadResults) {
      await updateOrcamentoWithImage(id, { imageUrl: img.imageUrl, public_id: img.public_id });
    }

    res.json({ msg: `✅ ${uploadResults.length} imagem(ns) enviada(s) com sucesso`, imagens: uploadResults });
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
    await updateOrcamentoWithImage(id, { public_id, remove: true });
    res.json({ msg: '🗑️ Imagem removida com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao remover imagem:', err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;