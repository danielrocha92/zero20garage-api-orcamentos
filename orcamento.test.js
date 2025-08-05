const request = require('supertest');
const app = require('../src/app');

describe('API de Orçamentos', () => {
  it('GET /api/orcamentos deve retornar 200 e um array', async () => {
    const res = await request(app).get('/api/orcamentos');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/orcamentos deve criar um orçamento (sem erros)', async () => {
    const novoOrcamento = {
      cliente: "Teste",
      tipo: "Teste",
      pecasSelecionadas: [],
      servicosSelecionados: [],
      valorTotalPecas: 0,
      valorTotalServicos: 0,
      totalMaoDeObra: 0,
      valorTotal: 0,
      status: "Aberto"
    };

    const res = await request(app)
      .post('/api/orcamentos')
      .send(novoOrcamento);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.cliente).toBe("Teste");
  });
});
