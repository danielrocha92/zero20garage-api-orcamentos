// orcamento-admin-zero20-api/src/routes/orcamento.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const admin = require('firebase-admin');

// Habilitando a opção ignoreUndefinedProperties
const firestore = admin.firestore();
firestore.settings({
    ignoreUndefinedProperties: true
});

const orcamentosCollection = db.collection('orcamentos');

// @route   GET /api/orcamentos
// @desc    Obter todos os orçamentos
// @access  Public
router.get('/', async (req, res) => {
    try {
        const snapshot = await orcamentosCollection.orderBy('createdAt', 'desc').get();
        const orcamentos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(orcamentos);
    } catch (err) {
        console.error('Erro ao obter orçamentos:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao obter orçamentos' });
    }
});

// @route   GET /api/orcamentos/:id
// @desc    Obter um orçamento por ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const docRef = orcamentosCollection.doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: 'Orçamento não encontrado' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error('Erro ao obter orçamento por ID:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao obter orçamento por ID' });
    }
});

// @route   POST /api/orcamentos
// @desc    Criar um novo orçamento
// @access  Public
router.post('/', async (req, res) => {
    const {
        cliente, telefone, veiculo, placa, ordemServico, tipo,
        pecasSelecionadas, servicosSelecionados,
        valorTotalPecas, valorTotalServicos, totalMaoDeObra, valorTotal,
        formaPagamento, garantia, observacoes, status
    } = req.body;

    if (!cliente || !tipo) {
        return res.status(400).json({ msg: 'Cliente e Tipo de orçamento são campos obrigatórios.' });
    }

    const novoOrcamentoData = {
        cliente,
        telefone: telefone || '',
        veiculo: veiculo || '',
        placa: placa || '',
        ordemServico: ordemServico || '',
        data: admin.firestore.FieldValue.serverTimestamp(),
        tipo,
        pecasSelecionadas: pecasSelecionadas || [],
        servicosSelecionados: servicosSelecionados || [],
        valorTotalPecas: valorTotalPecas || 0,
        valorTotalServicos: valorTotalServicos || 0,
        totalMaoDeObra: totalMaoDeObra || 0,
        valorTotal: valorTotal || 0,
        formaPagamento: formaPagamento || '',
        garantia: garantia || '',
        observacoes: observacoes || '',
        status: status || 'Aberto',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        if (ordemServico) {
            const existingDoc = await orcamentosCollection.where('ordemServico', '==', ordemServico).limit(1).get();
            if (!existingDoc.empty) {
                return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
            }
        }

        const docRef = await orcamentosCollection.add(novoOrcamentoData);
        const newDoc = await docRef.get();
        res.status(201).json({ id: newDoc.id, ...newDoc.data() });
    } catch (err) {
        console.error('Erro ao criar orçamento:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao criar orçamento' });
    }
});

// @route   PUT /api/orcamentos/:id
// @desc    Atualizar um orçamento existente
// @access  Public
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    // Cria um objeto de atualização dinâmico.
    const updatedOrcamentoData = {};

    // Adiciona apenas os campos enviados no corpo da requisição que não são 'undefined'.
    for (const key in body) {
        // Ignora o ID para evitar tentar atualizar o ID do documento
        if (key !== 'id' && body[key] !== undefined) {
            updatedOrcamentoData[key] = body[key];
        }
    }

    // Adiciona o timestamp de atualização.
    updatedOrcamentoData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    // Atualiza o campo de data principal, caso o front-end envie uma edição.
    updatedOrcamentoData.data = admin.firestore.FieldValue.serverTimestamp();

    try {
        const docRef = orcamentosCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: 'Orçamento não encontrado' });
        }

        if (body.ordemServico && body.ordemServico !== doc.data().ordemServico) {
            const existingDoc = await orcamentosCollection.where('ordemServico', '==', body.ordemServico).limit(1).get();
            if (!existingDoc.empty && existingDoc.docs[0].id !== id) {
                return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
            }
        }

        // Usa o método `update` para atualizar os campos fornecidos.
        await docRef.update(updatedOrcamentoData);

        const updatedDoc = await docRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (err) {
        console.error('Erro ao atualizar orçamento:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao atualizar orçamento' });
    }
});

// @route   DELETE /api/orcamentos/:id
// @desc    Deletar um orçamento
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const docRef = orcamentosCollection.doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: 'Orçamento não encontrado' });
        }

        await docRef.delete();
        res.json({ msg: 'Orçamento removido com sucesso' });
    } catch (err) {
        console.error('Erro ao deletar orçamento:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao deletar orçamento' });
    }
});

module.exports = router;