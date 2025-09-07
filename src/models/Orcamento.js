const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/db');

const orcamentosCollection = db.collection('orcamentos');

// GET /api/orcamentos
router.get('/', async (req, res) => {
  try {
    const snapshot = await orcamentosCollection.orderBy('createdAt', 'desc').get();
    const orcamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orcamentos);
  } catch (err) {
    console.error('Erro ao obter orçamentos:', err.message);
    res.status(500).send('Erro no Servidor ao obter orçamentos');
  }
});

// GET /api/orcamentos/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await orcamentosCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Erro ao obter orçamento por ID:', err.message);
    res.status(500).send('Erro no Servidor ao obter orçamento');
  }
});

// POST /api/orcamentos
router.post('/', async (req, res) => {
  const { cliente, tipo, ordemServico, ...rest } = req.body;
  if (!cliente || !tipo) return res.status(400).json({ msg: 'Cliente e Tipo são obrigatórios' });

  const novoOrcamentoData = {
    cliente,
    tipo,
    ordemServico: ordemServico || '',
    data: rest.data || new Date().toLocaleString('pt-BR'),
    ...rest,
    status: rest.status || 'Aberto',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (ordemServico) {
      const existing = await orcamentosCollection.where('ordemServico', '==', ordemServico).limit(1).get();
      if (!existing.empty) return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
    }

    const docRef = await orcamentosCollection.add(novoOrcamentoData);
    const newDoc = await docRef.get();
    res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (err) {
    console.error('Erro ao criar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao criar orçamento');
  }
});

// PUT /api/orcamentos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  try {
    const docRef = orcamentosCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });

    if (updatedData.ordemServico && updatedData.ordemServico !== doc.data().ordemServico) {
      const existing = await orcamentosCollection.where('ordemServico', '==', updatedData.ordemServico).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== id) return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
    }

    await docRef.set(updatedData, { merge: true });
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error('Erro ao atualizar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao atualizar orçamento');
  }
});

// DELETE /api/orcamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const docRef = orcamentosCollection.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ msg: 'Orçamento não encontrado' });

    await docRef.delete();
    res.json({ msg: 'Orçamento removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao deletar orçamento');
  }
});

module.exports = router;
