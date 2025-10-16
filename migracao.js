// migracao.js
import { db } from './src/config/db.js'; // Importe sua configuração do DB

/**
 * Script para migrar documentos da coleção 'orcamentos' de um ID automático
 * para um ID baseado no campo 'ordemServico'.
 */
async function migrarOrcamentos() {
  console.log('🏁 Iniciando migração de orçamentos...');

  const orcamentosRef = db.collection('orcamentos');
  const snapshot = await orcamentosRef.get();

  if (snapshot.empty) {
    console.log('✅ Nenhum documento encontrado para migrar.');
    return;
  }

  // Usamos um "batch" para executar todas as operações de uma vez.
  // Isso é mais seguro e eficiente. Se uma falhar, nenhuma é executada.
  const batch = db.batch();
  let migracoesPendentes = 0;

  snapshot.forEach(doc => {
    const dados = doc.data();
    const idAntigo = doc.id;

    // A heurística para identificar um documento antigo é o tamanho do ID.
    // IDs do Firestore têm 20 caracteres.
    if (idAntigo.length === 20 && dados.ordemServico) {
      const idNovo = String(dados.ordemServico);

      // Remove o campo redundante 'ordemServico' dos dados
      delete dados.ordemServico;

      // Define a criação do novo documento no batch
      const novoDocRef = orcamentosRef.doc(idNovo);
      batch.set(novoDocRef, dados);

      // Define a exclusão do documento antigo no batch
      batch.delete(doc.ref);

      console.log(`  -> Agendado: Migrar ID [${idAntigo}] para [${idNovo}]`);
      migracoesPendentes++;
    }
  });

  if (migracoesPendentes > 0) {
    console.log(`\n⏳ Executando ${migracoesPendentes} migrações em batch...`);
    await batch.commit();
    console.log(`\n✅ Migração concluída com sucesso! ${migracoesPendentes} documentos foram atualizados.`);
  } else {
    console.log('✅ Nenhum documento no formato antigo foi encontrado para migrar.');
  }
}

// Executa a função e captura qualquer erro
migrarOrcamentos().catch(error => {
  console.error('❌ Erro durante a migração:', error);
});