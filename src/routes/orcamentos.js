import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { db, admin } from '../config/db.js';
import { Timestamp } from 'firebase-admin/firestore'; // Importante para consultas de data
import cloudinary from '../config/cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

/**
 * Função para obter o próximo número da Ordem de Serviço de forma transacional.
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

// Listar orçamentos (CORRIGIDO com sintaxe Firestore e paginação por cursor)
router.get('/', async (req, res) => {
  try {
    const { limit = 50, startAfter, search, tipo, data } = req.query;

    // A consulta base sempre ordena pela data para uma paginação consistente
    let orcamentosQuery = orcamentosCollection.orderBy('data', 'desc');

    // --- Filtros (adaptados para o Firestore) ---

    // Filtro de busca simples (exemplo buscando no campo 'cliente')
    // Nota: Firestore não suporta busca "LIKE" ou regex. A busca é por igualdade.
    // Para buscas complexas (parciais, em múltiplos campos), o ideal é usar um serviço como Algolia.
    if (search) {
      orcamentosQuery = orcamentosQuery.where('cliente', '==', search);
    }

    // Filtro por tipo de orçamento
    if (tipo) {
      orcamentosQuery = orcamentosQuery.where('tipo', '==', tipo);
    }

    // Filtro por data específica
    if (data) {
      const dataInicio = new Date(data);
      dataInicio.setUTCHours(0, 0, 0, 0);

      const dataFim = new Date(data);
      dataFim.setUTCHours(23, 59, 59, 999);

      orcamentosQuery = orcamentosQuery
        .where('data', '>=', Timestamp.fromDate(dataInicio))
        .where('data', '<=', Timestamp.fromDate(dataFim));
    }

    // --- Lógica de Paginação (Cursor) ---
    if (startAfter) {
      // O cliente deve enviar o timestamp em milissegundos do último item da página anterior
      const startAfterTimestamp = Timestamp.fromMillis(parseInt(startAfter, 10));
      orcamentosQuery = orcamentosQuery.startAfter(startAfterTimestamp);
    }

    // Limita o número de documentos por página
    orcamentosQuery = orcamentosQuery.limit(Number(limit));

    const snapshot = await orcamentosQuery.get();

    if (snapshot.empty) {
      return res.json({ orcamentos: [], nextCursor: null });
    }

    const orcamentos = [];
    snapshot.forEach(doc => {
      const docData = doc.data();
      orcamentos.push({
        id: doc.id,
        ...docData,
        data: docData.data?.toDate?.() || null, // Converte Timestamp para Date
      });
    });

    // O cursor para a próxima página será o timestamp do último documento desta página
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.data().data.toMillis() : null;

    res.json({ orcamentos, nextCursor });

  } catch (err) {
    console.error("Erro ao buscar orçamentos:", err);
    res.status(500).json({ message: "Erro interno no servidor." });
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
      updatedAt: data.updatedAt?.toDate?.() || data.data?.toDate?.() || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao obter orçamento' });
  }
});

// Criar orçamento
router.post('/', async (req, res) => {
  console.log('Recebida requisição para criar orçamento com corpo:', req.body);
  try {
    const ordemServico = await getNextOrdemServico();
    console.log('Próxima Ordem de Serviço:', ordemServico);
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    const orcamentoParaSalvar = {
      ...req.body,
      status: req.body.status || 'Aberto',
      ordemServico,
      data: serverTimestamp,
      updatedAt: serverTimestamp,
    };
    console.log('Objeto para salvar no Firestore:', orcamentoParaSalvar);

    const docRef = await orcamentosCollection.add(orcamentoParaSalvar);
    console.log('Orçamento salvo com sucesso. ID do documento:', docRef.id);
    res.status(201).json({ id: docRef.id, ...req.body, ordemServico, status: orcamentoParaSalvar.status });
  } catch (err) {
    console.error('Erro detalhado ao criar orçamento:', err);
    res.status(500).json({ erro: 'Erro ao criar orçamento', detalhes: err.message });
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

      uploadResults.push({ imageUrl: result.secure_url, public_id: result.public_id });
    }

    for (const result of uploadResults) {
      await updateOrcamentoWithImage(id, { imageUrl: result.imageUrl, public_id: result.public_id });
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
    // A rota no Cloudinary é o public_id completo, incluindo a pasta
    const fullPublicId = `orcamentos/${id}/${public_id}`;

    // A API do Cloudinary pode precisar do public_id exato, sem a extensão do arquivo.
    // O ideal é que o `public_id` já seja salvo corretamente no banco.
    // Se o public_id já contém a pasta, a linha acima não é necessária.
    await cloudinary.uploader.destroy(public_id);

    await updateOrcamentoWithImage(id, { public_id, remove: true });
    res.json({ msg: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover imagem' });
  }
});

export default router;