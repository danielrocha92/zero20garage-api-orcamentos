// src/routes/orcamento.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const admin = require('firebase-admin');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Configuração do Firestore
const firestore = admin.firestore();
firestore.settings({
    ignoreUndefinedProperties: true
});
const orcamentosCollection = db.collection('orcamentos');

// Configuração do Multer (upload em memória)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------- CRUD DE ORÇAMENTOS ---------------- //

// GET todos
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

// GET por ID
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

// POST criar orçamento
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
        imagens: [], // campo novo para armazenar URLs das imagens
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

// PUT atualizar
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const updatedOrcamentoData = {};
    for (const key in body) {
        if (key !== 'id' && body[key] !== undefined) {
            updatedOrcamentoData[key] = body[key];
        }
    }

    updatedOrcamentoData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
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

        await docRef.update(updatedOrcamentoData);

        const updatedDoc = await docRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (err) {
        console.error('Erro ao atualizar orçamento:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao atualizar orçamento' });
    }
});

// DELETE orçamento
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

// ---------------- UPLOAD DE IMAGEM ---------------- //

// POST /api/orcamentos/:id/imagens
router.post('/:id/imagens', upload.single('imagem'), async (req, res) => {
    const { id } = req.params;

    try {
        const docRef = orcamentosCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: 'Orçamento não encontrado' });
        }

        if (!req.file) {
            return res.status(400).json({ msg: 'Nenhum arquivo enviado' });
        }

        // Converte buffer em stream para o Cloudinary
        const bufferStream = new Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null);

        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: `orcamentos/${id}` },
            async (error, result) => {
                if (error) {
                    console.error('Erro no upload Cloudinary:', error);
                    return res.status(500).json({ erro: 'Falha no upload da imagem' });
                }

                // Atualiza Firestore com a URL
                await docRef.update({
                    imagens: admin.firestore.FieldValue.arrayUnion(result.secure_url),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                res.json({ url: result.secure_url });
            }
        );

        bufferStream.pipe(uploadStream);

    } catch (err) {
        console.error('Erro ao fazer upload da imagem:', err.message);
        res.status(500).json({ erro: 'Erro no servidor ao fazer upload da imagem' });
    }
});

module.exports = router;
