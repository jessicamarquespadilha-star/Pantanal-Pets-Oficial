import './env.js';
import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import cepRoutes from './routes/cepRoutes.js';
import { registrarRotas } from './routes/apiRoutes.js';
import { inicializarBanco, root, dbFile, modoArmazenamento, criarDAO } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.join(root, 'frontend');

const app = express();

// WebSocket mínimo, sem dependência externa, para o bônus de atualização em
// tempo real. O servidor só precisa enviar eventos; o navegador cuida do
// handshake, máscara dos frames e reconexão.
const websocketClientes = new Set();

function frameWebSocket(texto) {
  const payload = Buffer.from(texto);
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  }
  if (payload.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function enviarWebSocket(socket, dados) {
  if (!socket.destroyed) socket.write(frameWebSocket(JSON.stringify(dados)));
}

function emitirAtualizacao(dados) {
  const evento = {
    evento: 'atualizacao',
    ...dados,
    em: new Date().toISOString(),
  };
  for (const socket of websocketClientes) {
    try {
      enviarWebSocket(socket, evento);
    } catch {
      websocketClientes.delete(socket);
      socket.destroy();
    }
  }
}

function aceitarWebSocket(req, socket) {
  const chave = req.headers['sec-websocket-key'];
  if (!chave || req.headers.upgrade?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const aceitacao = crypto
    .createHash('sha1')
    .update(`${chave}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${aceitacao}`,
    '',
    '',
  ].join('\r\n'));

  websocketClientes.add(socket);
  socket.setNoDelay(true);
  enviarWebSocket(socket, {
    evento: 'conectado',
    mensagem: 'Canal de atualizações em tempo real conectado.',
  });

  socket.on('data', (buffer) => {
    // Trata apenas close e ping. Não há necessidade de interpretar mensagens
    // de aplicação, pois este canal é unidirecional para eventos do servidor.
    if (!buffer.length) return;
    const opcode = buffer[0] & 0x0f;
    if (opcode === 0x8) {
      socket.end();
    } else if (opcode === 0x9) {
      const payload = buffer.length > 2 ? buffer.subarray(2) : Buffer.alloc(0);
      const frame = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);
      socket.write(frame);
    }
  });
  socket.on('close', () => websocketClientes.delete(socket));
  socket.on('error', () => websocketClientes.delete(socket));
}

const PORT = Number(process.env.PORT) || 3000;
const emProducao = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || (!emProducao ? '030462' : '');
const SESSION_SECRET = process.env.SESSION_SECRET || (!emProducao ? 'stackblitz-dev-secret' : '');
// Número único de atendimento solicitado para a Loja Pet. Não permite que uma variável antiga de ambiente substitua o número.
const WHATSAPP_NUMERO = '556792460374';
const CIDADES_ATENDIDAS = String(process.env.CIDADES_ATENDIDAS || 'Corumbá,Ladário')
  .split(',').map((cidade) => cidade.trim()).filter(Boolean);
const LIMITE_IMAGEM_MB = 5;
const FRONTEND_URLS = String(process.env.FRONTEND_URL || '')
  .split(',').map((url) => url.trim().replace(/\/$/, '')).filter(Boolean);
const FRONTEND_URL = FRONTEND_URLS[0] || '';

// Permite previews apenas dos projetos conhecidos do StackBlitz.
// O sufixo aleatório do ambiente pode mudar; por isso, validamos o nome
// do projeto, a porta 3000, o domínio HTTPS do WebContainer e o formato do ID.
// Não libera todas as origens *.webcontainer.io indiscriminadamente.
function origemStackBlitzPermitida(origem) {
  try {
    const url = new URL(origem);
    if (url.protocol !== 'https:' || url.port || url.pathname !== '/' || url.search || url.hash) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return /^(?:pantanalpetsoficial|stackblitzstarterspfgtbrt4)-[a-z0-9-]+--3000--[a-f0-9]+\.local-credentialless\.webcontainer\.io$/.test(host);
  } catch {
    return false;
  }
}
if (emProducao) {
  app.set('trust proxy', 1);
  if (!ACCESS_TOKEN || !SESSION_SECRET) {
    throw new Error('Em produção, defina ACCESS_TOKEN e SESSION_SECRET.');
  }
}

app.use(express.json({ limit: `${LIMITE_IMAGEM_MB + 1}mb` }));

// CORS explícito exigido pela atividade: funciona tanto em desenvolvimento
// quanto em deploy com front-end e back-end em origens distintas.
app.use((req, res, next) => {
  const origem = typeof req.headers.origin === 'string' ? req.headers.origin.replace(/\/$/, '') : '';
  // Nunca refletir automaticamente qualquer Origin: em produção isso exporia
  // endpoints autenticados por cookie a origens não confiáveis.
  const mesmaOrigem = Boolean(origem && `${req.protocol}://${req.get('host')}` === origem);
  const permitida = Boolean(
    origem && (
      mesmaOrigem ||
      FRONTEND_URLS.includes(origem) ||
      origemStackBlitzPermitida(origem)
    )
  );
  if (permitida) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(permitida ? 204 : 403).end();
  next();
});

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: emProducao ? 'none' : 'lax',
    secure: emProducao,
    maxAge: 1000 * 60 * 60,
  },
}));

function ok(res, dados, mensagem, status = 200) {
  return res.status(status).json({ sucesso: true, dados, mensagem });
}

function falha(res, status, codigo, mensagem) {
  return res.status(status).json({ sucesso: false, erro: { codigo, mensagem } });
}

function exigeLogin(req, res, next) {
  if (req.session?.autenticado === true) return next();
  return falha(res, 401, 'NAO_AUTORIZADO', 'Não autorizado. Faça login primeiro.');
}

function exigeAdmin(req, res, next) {
  if (req.session?.autenticado === true && req.session?.tipo === 'administrador') return next();
  if (req.session?.autenticado === true) {
    return falha(res, 403, 'ACESSO_NEGADO', 'Ação disponível apenas para administradores.');
  }
  return falha(res, 401, 'NAO_AUTORIZADO', 'Não autorizado. Faça login primeiro.');
}

registrarRotas(app, {
  ok,
  falha,
  exigeLogin,
  exigeAdmin,
  ACCESS_TOKEN,
  WHATSAPP_NUMERO,
  CIDADES_ATENDIDAS,
  LIMITE_IMAGEM_MB,
  emitirAtualizacao,
});

// Rota de exclusão registrada diretamente no servidor para garantir que
// o DELETE esteja disponível antes do fallback "Rota de API não encontrada".
app.delete('/api/agendamentos-banho-tosa/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return falha(res, 400, 'ID_INVALIDO', 'Agendamento inválido.');
    }

    const dao = criarDAO();
    const statement = dao.prepare('DELETE FROM agendamentos_banho_tosa WHERE id = ?');
    statement.run([id]);
    statement.free();

    if (!dao.linhasAfetadas()) {
      return falha(res, 404, 'AGENDAMENTO_NAO_ENCONTRADO', 'Agendamento não encontrado.');
    }

    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'agendamento', acao: 'excluido', id });
    return ok(res, { id }, 'Agendamento excluído com sucesso.');
  } catch (error) {
    next(error);
  }
});

app.use('/api/cep', cepRoutes);

app.use('/api', (req, res) => {
  falha(res, 404, 'ROTA_NAO_ENCONTRADA', 'Rota de API não encontrada.');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return falha(res, 413, 'PAYLOAD_GRANDE', 'O conteúdo enviado é grande demais.');
  }
  if (err?.type === 'entity.parse.failed') {
    return falha(res, 400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
  }
  falha(res, 500, 'ERRO_INTERNO', 'Erro interno do servidor.');
});

async function start() {
  await inicializarBanco();

  if (emProducao) {
    const dist = path.join(frontendRoot, 'dist');
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: frontendRoot,
      server: { middlewareMode: true, hmr: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  httpServer.on('upgrade', (req, socket) => {
    if (req.url === '/ws') {
      aceitarWebSocket(req, socket);
      return;
    }
    socket.destroy();
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor fullstack na porta ${PORT}`);
    console.log(`Banco SQLite: ${dbFile} (armazenamento: ${modoArmazenamento()})`);
    console.log(`WebSocket: /ws`);
  });
}

start().catch((error) => {
  console.error('Erro ao iniciar o servidor:', error);
  process.exit(1);
});
