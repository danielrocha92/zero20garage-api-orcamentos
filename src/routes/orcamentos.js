// src/routes/orcamentos.js
import express from 'express';
import { db, admin } from '../config/db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const orcamentosCollection = db.collection('orcamentos');

// O middleware CORS na rota específica pode ser removido se já estiver em app.js
router.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// --- Rotas de CRUD ---

// Listar todos os orçamentos (CORREÇÃO)
router.get('/', async (req, res) => {
    try {
        const { page = 1, size = 10 } = req.query;
        const pageNumber = parseInt(page);
        const sizeNumber = parseInt(size);

        if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizeNumber) || sizeNumber < 1) {
            return res.status(400).json({ erro: 'Parâmetros de paginação inválidos' });
        }

        const offset = (pageNumber - 1) * sizeNumber;
        const snapshot = await orcamentosCollection.limit(sizeNumber).offset(offset).get();

        const orcamentos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(orcamentos);
    } catch (error) {
        console.error('Erro ao buscar orçamentos:', error);
        res.status(500).json({ erro: 'Erro ao buscar orçamentos' });
    }
});

// Obter um único orçamento por ID
router.get('/:id', async (req, res) => {
    try {
        const doc = await orcamentosCollection.doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ erro: 'Orçamento não encontrado' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Erro ao obter orçamento:', error);
        res.status(500).json({ erro: 'Erro ao obter orçamento' });
    }
});

// Criar um novo orçamento
router.post('/', async (req, res) => {
    try {
        const novoOrcamento = req.body;
        const docRef = await orcamentosCollection.add(novoOrcamento);
        res.status(201).json({ id: docRef.id, ...novoOrcamento });
    } catch (error) {
        console.error('Erro ao criar orçamento:', error);
        res.status(500).json({ erro: 'Erro ao criar orçamento' });
    }
});

// Atualizar um orçamento existente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dadosAtualizados = req.body;
        await orcamentosCollection.doc(id).update(dadosAtualizados);
        res.json({ id, ...dadosAtualizados });
    } catch (error) {
        console.error('Erro ao atualizar orçamento:', error);
        res.status(500).json({ erro: 'Erro ao atualizar orçamento' });
    }
});

// Excluir um orçamento
router.delete('/:id', async (req, res) => {
    try {
        await orcamentosCollection.doc(req.params.id).delete();
        res.json({ msg: 'Orçamento excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        res.status(500).json({ erro: 'Erro ao excluir orçamento' });
    }
});

// --- Rotas de Upload e Exclusão de Imagens ---
router.post('/:id/imagens', upload.array('imagens'), async (req, res) => {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: 'Nenhuma imagem enviada.' });
    }

    // Configurar Cloudinary com as variáveis de ambiente
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    try {
        const uploadResults = [];
        for (const file of req.files) {
            const bufferStream = new Readable();
            bufferStream.push(file.buffer);
            bufferStream.push(null);

            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: `orcamentos/${id}` },
                    (error, result) => {
                        if (error) {
                          console.error('Cloudinary upload error:', error);
                          return reject(new Error('Cloudinary upload failed: ' + error.message));
                        }
                        resolve(result);
                    }
                );
                bufferStream.pipe(uploadStream);
            });

            uploadResults.push({
                imagemUrl: result.secure_url,
                public_id: result.public_id
            });
        }

        await updateOrcamentoWithImage(id, uploadResults);

        res.json({
            message: 'Uploads realizados com sucesso',
            imagens: uploadResults
        });
    } catch (err) {
        console.error('Erro no upload de imagem:', err);
        res.status(500).json({ erro: 'Erro ao enviar imagem' });
    }
});

router.delete('/:id/imagens/:public_id', async (req, res) => {
    const { id, public_id } = req.params;

    // Configurar Cloudinary com as variáveis de ambiente
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    try {
        await cloudinary.uploader.destroy(public_id);
        await updateOrcamentoWithImage(id, null, public_id);
        res.json({ msg: 'Imagem removida com sucesso' });
    } catch (err) {
        console.error('Erro ao remover imagem:', err);
        res.status(500).json({ erro: 'Erro ao remover imagem' });
    }
});

export default router;