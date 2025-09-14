import express from 'express';
import multer from 'multer';
import cloudinary from '../cloudinary.js';
import { updateOrcamentoWithImage } from '../services/orcamentosService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/imagens/:orcamentoId
router.post('/:orcamentoId', upload.single('imagem'), async (req, res) => {
  const { orcamentoId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  try {
    const result = await cloudinary.uploader.upload_stream(
      { folder: `orcamentos/${orcamentoId}` },
      async (error, result) => {
        if (error) {
          console.error('Erro Cloudinary:', error);
          return res.status(500).json({ error: 'Erro no upload para Cloudinary' });
        }

        // Atualiza o orçamento com a URL retornada pelo Cloudinary
        await updateOrcamentoWithImage(orcamentoId, result.secure_url, result.public_id);
        res.json({ imagemUrl: result.secure_url, public_id: result.public_id });
      }
    );

    result.end(req.file.buffer); // envia o buffer do multer para Cloudinary
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao enviar imagem' });
  }
});

// DELETE /api/imagens/:orcamentoId/:public_id
router.delete('/:orcamentoId/:public_id', async (req, res) => {
  const { orcamentoId, public_id } = req.params;

  try {
    await cloudinary.uploader.destroy(public_id); // remove do Cloudinary
    // remover URL do orçamento
    await updateOrcamentoWithImage(orcamentoId, null, public_id, true);
    res.json({ message: 'Imagem removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover imagem:', err);
    res.status(500).json({ error: 'Erro ao remover imagem' });
  }
});

export default router;
