// orcamento-admin-zero20-api/src/models/Orcamento.js
// Este arquivo agora serve como documentação do esquema de dados para o Firestore.
// Não há um "modelo" Mongoose tradicional aqui.

/**
 * Esquema de Dados para Documentos de Orçamento no Firestore:
 *
 * Cada documento na coleção 'orcamentos' terá a seguinte estrutura:
 *
 * {
 * id?: string, // Opcional: ID do documento Firestore (gerado automaticamente)
 * cliente: string, // Nome do cliente (obrigatório)
 * telefone: string,
 * veiculo: string,
 * placa: string,
 * ordemServico: string, // Pode ser única e opcional
 * data: string, // Data de criação (formato string, ex: "DD/MM/YYYY HH:MM:SS")
 * tipo: 'motor' | 'cabecote', // Tipo de orçamento (obrigatório)
 * pecasSelecionadas: string[], // Array de strings formatadas para peças
 * servicosSelecionados: string[], // Array de strings formatadas para serviços
 * valorTotalPecas: number,
 * valorTotalServicos: number,
 * totalMaoDeObra: number,
 * valorTotal: number,
 * formaPagamento: string,
 * garantia: string,
 * observacoes: string,
 * status: 'Aberto' | 'Aprovado' | 'Rejeitado' | 'Concluído', // Padrão: 'Aberto'
 * createdAt: Timestamp, // Gerado automaticamente pelo Firestore (se usado server-side)
 * updatedAt: Timestamp, // Gerado automaticamente pelo Firestore (se usado server-side)
 * }
 */

// Não há exportação de um modelo Mongoose aqui.
// A lógica de validação e salvamento será feita diretamente nas rotas usando a API do Firestore.

// orcamento-admin-zero20-api/src/routes/orcamento.js
// Rotas da API para Orçamentos (CRUD) usando Firestore.

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
    servicosSelecionados,
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
```
# orcamento-admin-zero20-api/.env
# Variáveis de Ambiente para o Projeto da API Orcamento Admin Zero20 Garage
#
# Para o Firebase Admin SDK, você precisará das credenciais da sua conta de serviço.
# Estas credenciais são obtidas no console do Firebase:
# Projeto -> Configurações do Projeto -> Contas de Serviço -> Gerar nova chave privada
# O arquivo JSON baixado contém 'project_id', 'private_key' e 'client_email'.
#
# ATENÇÃO: NUNCA exponha essas chaves diretamente no código ou em repositórios públicos.
# Use variáveis de ambiente, especialmente em ambientes de produção como o Render.
#
# Para a 'private_key', se ela contiver quebras de linha, você pode precisar
# substituí-las por '\\n' ao configurar a variável de ambiente no Render,
# e então usar .replace(/\\n/g, '\n') no seu código Node.js (como já está no db.js).

FIREBASE_PROJECT_ID="seu-project-id-do-firebase"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@<seu-project-id>.iam.gserviceaccount.com"

# Porta em que o servidor Node.js irá rodar
PORT=5000
```