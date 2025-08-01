// orcamento-admin-zero20-api/src/routes/orcamento.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db'); // Importa a instância do Firestore
const admin = require('firebase-admin'); // Importa admin para usar FieldValue.serverTimestamp()

const orcamentosCollection = db.collection('orcamentos'); // Referência à coleção de orçamentos

// @route   GET /api/orcamentos
// @desc    Obter todos os orçamentos
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Ordena pelos mais recentes (createdAt é um Timestamp do Firestore)
    const snapshot = await orcamentosCollection.orderBy('createdAt', 'desc').get();
    const orcamentos = snapshot.docs.map(doc => ({
      id: doc.id, // Adiciona o ID do documento ao objeto
      ...doc.data()
    }));
    res.json(orcamentos);
  } catch (err) {
    console.error('Erro ao obter orçamentos:', err.message);
    res.status(500).send('Erro no Servidor ao obter orçamentos');
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
    res.status(500).send('Erro no Servidor ao obter orçamento');
  }
});

// @route   POST /api/orcamentos
// @desc    Criar um novo orçamento
// @access  Public
router.post('/', async (req, res) => {
  const {
    cliente, telefone, veiculo, placa, ordemServico, data, tipo,
    pecasSelecionadas, servicosSelecionados,
    valorTotalPecas, valorTotalServicos, totalMaoDeObra, valorTotal,
    formaPagamento, garantia, observacoes, status
  } = req.body;

  // Validação básica (adicione mais validações conforme necessário)
  if (!cliente || !tipo) {
    return res.status(400).json({ msg: 'Cliente e Tipo de orçamento são campos obrigatórios.' });
  }

  const novoOrcamentoData = {
    cliente,
    telefone: telefone || '',
    veiculo: veiculo || '',
    placa: placa || '',
    ordemServico: ordemServico || '', // Pode ser uma string vazia se não fornecido
    data: data || new Date().toLocaleString('pt-BR'), // Usa a data fornecida ou a data atual
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
    status: status || 'Aberto', // Define o status padrão
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Adiciona timestamp do servidor
    updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Adiciona timestamp do servidor
  };

  try {
    // Se houver ordemServico e ela deve ser única, verifique antes de adicionar
    if (ordemServico) {
      const existingDoc = await orcamentosCollection.where('ordemServico', '==', ordemServico).limit(1).get();
      if (!existingDoc.empty) {
        return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
      }
    }

    const docRef = await orcamentosCollection.add(novoOrcamentoData);
    const newDoc = await docRef.get(); // Obtém o documento recém-criado com seu ID
    res.status(201).json({ id: newDoc.id, ...newDoc.data() }); // 201 Created
  } catch (err) {
    console.error('Erro ao criar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao criar orçamento');
  }
});

// @route   PUT /api/orcamentos/:id
// @desc    Atualizar um orçamento existente
// @access  Public
router.put('/:id', async (req, res) => {
  const { id } = req.params; // ID do documento Firestore
  const {
    cliente, telefone, veiculo, placa, ordemServico, data, tipo,
    pecasSelecionadas, servicosSelecionados,
    valorTotalPecas, valorTotalServicos, totalMaoDeObra, valorTotal,
    formaPagamento, garantia, observacoes, status
  } = req.body;

  // Cria um objeto com os campos a serem atualizados.
  // Campos não fornecidos no body não serão alterados se 'merge: true' for usado.
  const updatedOrcamentoData = {
    cliente,
    telefone,
    veiculo,
    placa,
    ordemServico,
    data,
    tipo,
    pecasSelecionadas,
    servicosSelecionadas,
    valorTotalPecas,
    valorTotalServicos,
    totalMaoDeObra,
    valorTotal,
    formaPagamento,
    garantia,
    observacoes,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Atualiza o timestamp
  };

  try {
    const docRef = orcamentosCollection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ msg: 'Orçamento não encontrado' });
    }

    // Se a ordemServico foi alterada e deve ser única, verifique duplicidade
    // Garante que não é o próprio documento que está sendo comparado
    if (ordemServico && ordemServico !== doc.data().ordemServico) {
      const existingDoc = await orcamentosCollection.where('ordemServico', '==', ordemServico).limit(1).get();
      if (!existingDoc.empty && existingDoc.docs[0].id !== id) {
        return res.status(400).json({ msg: 'Ordem de Serviço já existe.' });
      }
    }

    // Atualiza o documento. 'merge: true' garante que apenas os campos fornecidos sejam atualizados.
    await docRef.set(updatedOrcamentoData, { merge: true });

    const updatedDoc = await docRef.get(); // Obtém o documento atualizado para retornar
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error('Erro ao atualizar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao atualizar orçamento');
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

    await docRef.delete(); // Deleta o documento
    res.json({ msg: 'Orçamento removido com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar orçamento:', err.message);
    res.status(500).send('Erro no Servidor ao deletar orçamento');
  }
});

module.exports = router;
