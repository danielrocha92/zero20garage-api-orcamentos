import app from './app.js';

// Define a porta inicial que você deseja usar.
// Ele pega da variável de ambiente (process.env.PORT) ou usa 8080 como padrão.
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

/**
 * Função que tenta iniciar o servidor em uma porta específica.
 * Se a porta estiver ocupada, tenta a próxima.
 * @param {number} port A porta para tentar iniciar o servidor.
 */
function startServer(port) {
  // Tenta iniciar o servidor na porta fornecida
  const server = app.listen(port);

  // Evento disparado quando o servidor consegue iniciar com SUCESSO
  server.on('listening', () => {
    console.log(`🚀 Servidor rodando com sucesso na porta ${port}`);
  });

  // Evento disparado quando ocorre um ERRO ao tentar iniciar
  server.on('error', (error) => {
    // Verifica se o erro é especificamente de "porta em uso"
    if (error.code === 'EADDRINUSE') {
      console.warn(`⚠️  A porta ${port} já está em uso.`);
      console.log(`↪️  Tentando a próxima porta (${port + 1})...`);

      // Fecha o servidor que falhou para limpar os listeners
      server.close();

      // Tenta iniciar novamente na próxima porta
      startServer(port + 1);
    } else {
      // Se for qualquer outro tipo de erro, exibe e encerra.
      console.error('❌ Ocorreu um erro inesperado ao iniciar o servidor:', error);
      process.exit(1);
    }
  });
}

// Inicia o processo a partir da porta padrão
startServer(DEFAULT_PORT);