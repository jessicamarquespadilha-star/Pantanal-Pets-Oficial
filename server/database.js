import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashSenhaCliente, verificarHashSenha } from './security/password.js';
import initSqlJs from 'sql.js';
import { capitalizar } from './util.js';
import { SQLiteDAO } from './dao/sqliteDAO.js';
import { armazenamentoRemotoAtivo, prepararRemoto, carregarRemoto, gravarSnapshot, modoArmazenamento } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const root = path.resolve(__dirname, '..');
export const dataDir = path.join(root, 'data');
export const dbFile = path.join(dataDir, 'produtos.sqlite');
export const legacyFile = path.join(dataDir, 'produtos.json');

export const CATEGORIAS_PADRAO = [
  'Alimentação', 'Acessório', 'Higiene', 'Saúde e Farmácia', 'Brinquedos',
];

let db;
let SQL;

/**
 * SQLite compatível com WebContainer/StackBlitz.
 *
 * Não usa node:sqlite/DatabaseSync: algumas versões do WebContainer expõem
 * DatabaseSync, mas não expõem prepare/prepareSync, deixando o servidor
 * incapaz de iniciar. sql.js fornece uma API SQLite síncrona e estável em
 * WebAssembly e permite persistir o banco como um arquivo .sqlite.
 */

export function getDb() {
  if (!db) throw new Error('Banco de dados ainda não inicializado.');
  return db;
}

export { modoArmazenamento };

const EMAIL_CLIENTE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export async function registrarCliente({ nome, email, senha }) {
  if (!db) throw new Error('Banco de dados ainda não inicializado.');
  const nomeLimpo = String(nome || '').trim().replace(/\s+/g, ' ');
  const emailLimpo = String(email || '').trim().toLowerCase();
  const senhaTexto = String(senha || '');
  if (nomeLimpo.length < 2 || nomeLimpo.length > 100) throw Object.assign(new Error('Informe um nome com pelo menos 2 caracteres.'), { codigo: 'DADOS_INVALIDOS' });
  if (!EMAIL_CLIENTE_RE.test(emailLimpo) || emailLimpo.length > 254) throw Object.assign(new Error('Informe um e-mail válido.'), { codigo: 'DADOS_INVALIDOS' });
  if (senhaTexto.length < 8 || senhaTexto.length > 128) throw Object.assign(new Error('A senha deve ter entre 8 e 128 caracteres.'), { codigo: 'DADOS_INVALIDOS' });
  const existente = getDb().prepare('SELECT id FROM clientes WHERE email = ? COLLATE NOCASE');
  try { existente.bind([emailLimpo]); if (existente.step()) throw Object.assign(new Error('Já existe uma conta com este e-mail.'), { codigo: 'EMAIL_EM_USO' }); } finally { existente.free(); }
  const agora = new Date().toISOString();
  getDb().run('INSERT INTO clientes (nome, email, senha_hash, criado_em) VALUES (?, ?, ?, ?)', [nomeLimpo, emailLimpo, await hashSenhaCliente(senhaTexto), agora]);
  const id = Number(getDb().exec('SELECT last_insert_rowid() AS id')[0].values[0][0]);
  await salvarArquivoBanco();
  return { id, nome: nomeLimpo, email: emailLimpo };
}

export async function autenticarCliente({ email, senha }) {
  if (!db) throw new Error('Banco de dados ainda não inicializado.');
  const emailLimpo = String(email || '').trim().toLowerCase();
  const senhaTexto = String(senha || '');
  if (!emailLimpo || !senhaTexto) return null;
  const stmt = getDb().prepare('SELECT id, nome, email, senha_hash FROM clientes WHERE email = ? COLLATE NOCASE');
  let cliente = null;
  try { stmt.bind([emailLimpo]); if (stmt.step()) cliente = stmt.getAsObject(); } finally { stmt.free(); }
  if (!cliente || typeof cliente.senha_hash !== 'string') return null;
  if (!(await verificarHashSenha(senhaTexto, cliente.senha_hash))) return null;
  return { id: Number(cliente.id), nome: cliente.nome, email: cliente.email };
}

export function criarDAO() {
  return new SQLiteDAO(getDb, {
    filePath: dbFile,
    persistir: (bytes) => gravarSnapshot(bytes, dbFile),
  });
}

function obterOuCriarCategoriaIdInterno(nomeInformado) {
  const nome = capitalizar(nomeInformado);
  if (!nome) return null;
  const existente = getDb().prepare('SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)');
  existente.bind([nome]);
  let id = null;
  if (existente.step()) id = Number(existente.getAsObject().id);
  existente.free();
  if (id) return id;
  getDb().run('INSERT INTO categorias (nome) VALUES (?)', [nome]);
  return Number(getDb().exec('SELECT last_insert_rowid() AS id')[0].values[0][0]);
}

async function salvarBancoInicializacao() {
  await salvarArquivoBanco();
}

async function salvarArquivoBanco() {
  if (!db) throw new Error('Banco de dados ainda não inicializado.');
  await gravarSnapshot(db.export(), dbFile);
}

function colunasDe(tabela) {
  const result = getDb().exec(`PRAGMA table_info(${tabela})`);
  if (!result.length) return [];
  return result[0].values.map((v) => v[1]);
}

function criarTabelas() {
  getDb().run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, senha_hash TEXT NOT NULL, criado_em TEXT NOT NULL)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria_id INTEGER NOT NULL REFERENCES categorias(id), preco REAL NOT NULL CHECK(preco >= 0), descricao TEXT, validade TEXT, unidade_venda TEXT, imagem TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS historico (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, produto_id INTEGER, produto_nome TEXT NOT NULL, detalhes TEXT, criado_em TEXT NOT NULL)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS cupons (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE, descricao TEXT, tipo TEXT NOT NULL DEFAULT 'percentual', valor REAL NOT NULL CHECK(valor > 0), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL, categoria_id INTEGER REFERENCES categorias(id), validade_inicio TEXT, validade_fim TEXT)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS agendamentos_banho_tosa (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_cliente TEXT NOT NULL, nome_pet TEXT NOT NULL, porte TEXT, servico TEXT NOT NULL, valor_servico REAL NOT NULL, data TEXT NOT NULL, horario TEXT NOT NULL, transporte TEXT, taxa_transporte REAL NOT NULL DEFAULT 0, observacoes TEXT, status TEXT NOT NULL DEFAULT 'pendente', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
  // Migração segura para bancos já existentes: acrescenta os dados do animal sem apagar agendamentos.
  const colunasAgendamento = colunasDe('agendamentos_banho_tosa');
  if (!colunasAgendamento.includes('animal')) {
    getDb().run("ALTER TABLE agendamentos_banho_tosa ADD COLUMN animal TEXT NOT NULL DEFAULT 'Cachorro'");
  }
  if (!colunasAgendamento.includes('raca')) {
    getDb().run("ALTER TABLE agendamentos_banho_tosa ADD COLUMN raca TEXT NOT NULL DEFAULT ''");
  }
  getDb().run(`CREATE TABLE IF NOT EXISTS banho_servicos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, descricao TEXT, valor REAL NOT NULL CHECK(valor >= 0), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
  getDb().run(`CREATE TABLE IF NOT EXISTS banho_veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, descricao TEXT, taxa REAL NOT NULL CHECK(taxa >= 0), icone TEXT DEFAULT 'fa-car', ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
}

function criarIndices() {
  getDb().run('CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id)');
  getDb().run('CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome)');
  getDb().run('CREATE INDEX IF NOT EXISTS idx_historico_criado ON historico(criado_em)');
}

function semearCuponsPadrao() {
  const existentes = Number(getDb().exec('SELECT COUNT(*) AS total FROM cupons')[0]?.values[0]?.[0] || 0);
  if (existentes > 0) return;
  const agora = new Date().toISOString();
  const stmt = getDb().prepare('INSERT INTO cupons (codigo, descricao, tipo, valor, ativo, criado_em) VALUES (?, ?, ?, ?, 1, ?)');
  stmt.run(['PET10', '10% de desconto em qualquer compra', 'percentual', 10, agora]);
  stmt.run(['BEMVINDO15', '15% de desconto para o primeiro pedido', 'percentual', 15, agora]);
  stmt.run(['FRETE20', 'R$ 20,00 de desconto', 'fixo', 20, agora]);
  stmt.free();
}

function semearBanhoTosaPadrao() {
  const agora = new Date().toISOString();
  const totalServicos = Number(getDb().exec('SELECT COUNT(*) AS total FROM banho_servicos')[0]?.values[0]?.[0] || 0);
  if (!totalServicos) {
    const s = getDb().prepare('INSERT INTO banho_servicos (nome, descricao, valor, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, 1, ?, ?)');
    [
      ['Banho simples', 'Higienização, secagem e escovação.', 45],
      ['Banho + hidratação', 'Banho completo com hidratação da pelagem.', 65],
      ['Tosa higiênica', 'Acabamento nas regiões de higiene e patas.', 35],
      ['Tosa completa', 'Tosa conforme o tipo de pelagem e necessidade do pet.', 70],
      ['Banho + tosa completa', 'Pacote completo para deixar o pet limpo e confortável.', 105],
    ].forEach(v => s.run([...v, agora, agora]));
    s.free();
  }
  const totalVeiculos = Number(getDb().exec('SELECT COUNT(*) AS total FROM banho_veiculos')[0]?.values[0]?.[0] || 0);
  if (!totalVeiculos) {
    const v = getDb().prepare('INSERT INTO banho_veiculos (nome, descricao, taxa, icone, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, 1, ?, ?)');
    [
      ['Carro Conforto', 'Veículo climatizado para viagens tranquilas.', 15, 'fa-car-side'],
      ['Carro Espaçoso', 'Mais espaço para pets de médio e grande porte.', 20, 'fa-truck'],
      ['Van Pet', 'Mais espaço para caixas e acessórios.', 25, 'fa-shuttle-van'],
    ].forEach(x => v.run([...x, agora, agora]));
    v.free();
  }
}

function semearCategoriasPadrao() {
  const stmt = getDb().prepare('INSERT OR IGNORE INTO categorias (nome) VALUES (?)');
  for (const nome of CATEGORIAS_PADRAO) stmt.run([nome]);
  stmt.free();
}

const CATEGORIA_FALLBACK = 'Sem categoria';
function idCategoriaFallback() {
  getDb().run('INSERT OR IGNORE INTO categorias (nome) VALUES (?)', [CATEGORIA_FALLBACK]);
  const stmt = getDb().prepare('SELECT id FROM categorias WHERE nome = ?');
  try { stmt.bind([CATEGORIA_FALLBACK]); if (stmt.step()) return Number(stmt.getAsObject().id); }
  finally { stmt.free(); }
  throw new Error('Não foi possível criar a categoria de fallback.');
}

function migrarProdutosParaCategoriaId(colunas) {
  const tem = (nome) => colunas.includes(nome);
  const agora = new Date().toISOString();
  getDb().run('BEGIN');
  try {
    if (tem('categoria')) {
      const distintas = getDb().exec("SELECT DISTINCT categoria FROM produtos WHERE TRIM(COALESCE(categoria, '')) <> ''");
      if (distintas.length) for (const [nome] of distintas[0].values) getDb().run('INSERT OR IGNORE INTO categorias (nome) VALUES (?)', [capitalizar(nome)]);
    }
    const fallbackId = idCategoriaFallback();
    getDb().run('DROP TABLE IF EXISTS produtos_novo');
    getDb().run(`CREATE TABLE produtos_novo (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria_id INTEGER NOT NULL REFERENCES categorias(id), preco REAL NOT NULL CHECK(preco >= 0), descricao TEXT, validade TEXT, unidade_venda TEXT, imagem TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)`);
    const categoriaExpr = tem('categoria')
      ? `COALESCE((SELECT c.id FROM categorias c WHERE LOWER(c.nome) = LOWER(TRIM(p.categoria))), ?)`
      : '?';
    getDb().run(`INSERT INTO produtos_novo (id, nome, categoria_id, preco, descricao, validade, unidade_venda, imagem, criado_em, atualizado_em)
      SELECT p.id, COALESCE(NULLIF(TRIM(CAST(p.nome AS TEXT)), ''), 'Produto sem nome'), ${categoriaExpr}, MAX(0, COALESCE(CAST(p.preco AS REAL), 0)), ${tem('descricao') ? 'p.descricao' : 'NULL'}, ${tem('validade') ? 'p.validade' : 'NULL'}, ${tem('unidade_venda') ? 'p.unidade_venda' : 'NULL'}, ${tem('imagem') ? 'p.imagem' : 'NULL'}, ${tem('criado_em') ? 'COALESCE(p.criado_em, ?)' : '?'}, ${tem('atualizado_em') ? 'COALESCE(p.atualizado_em, ?)' : '?'} FROM produtos p`, [fallbackId, agora, agora]);
    getDb().run('DROP TABLE produtos');
    getDb().run('ALTER TABLE produtos_novo RENAME TO produtos');
    getDb().run('COMMIT');
  } catch (erro) { try { getDb().run('ROLLBACK'); } catch {} throw erro; }
}

function repararProdutosOrfaos() {
  const orfaos = Number(getDb().exec(`SELECT COUNT(*) FROM produtos WHERE categoria_id IS NULL OR categoria_id NOT IN (SELECT id FROM categorias)`)[0]?.values[0]?.[0] || 0);
  if (!orfaos) return;
  getDb().run(`UPDATE produtos SET categoria_id = ? WHERE categoria_id IS NULL OR categoria_id NOT IN (SELECT id FROM categorias)`, [idCategoriaFallback()]);
}

async function migrarSeNecessario() {
  let colunasProdutos = colunasDe('produtos');
  if (colunasProdutos.length && !colunasProdutos.includes('descricao')) { getDb().run('ALTER TABLE produtos ADD COLUMN descricao TEXT'); colunasProdutos = [...colunasProdutos, 'descricao']; }
  if (colunasProdutos.length && !colunasProdutos.includes('validade')) { getDb().run('ALTER TABLE produtos ADD COLUMN validade TEXT'); colunasProdutos = [...colunasProdutos, 'validade']; }
  if (colunasProdutos.length && !colunasProdutos.includes('unidade_venda')) { getDb().run('ALTER TABLE produtos ADD COLUMN unidade_venda TEXT'); colunasProdutos = [...colunasProdutos, 'unidade_venda']; }
  if (colunasProdutos.length && !colunasProdutos.includes('imagem')) { getDb().run('ALTER TABLE produtos ADD COLUMN imagem TEXT'); colunasProdutos = [...colunasProdutos, 'imagem']; }
  if (colunasProdutos.length && !colunasProdutos.includes('categoria_id')) migrarProdutosParaCategoriaId(colunasProdutos);

  const colunasCupons = colunasDe('cupons');
  if (colunasCupons.length) {
    if (!colunasCupons.includes('categoria_id')) getDb().run('ALTER TABLE cupons ADD COLUMN categoria_id INTEGER');
    if (!colunasCupons.includes('validade_inicio')) getDb().run('ALTER TABLE cupons ADD COLUMN validade_inicio TEXT');
    if (!colunasCupons.includes('validade_fim')) getDb().run('ALTER TABLE cupons ADD COLUMN validade_fim TEXT');
  }

  const totalProdutos = Number(getDb().exec('SELECT COUNT(*) AS total FROM produtos')[0]?.values[0]?.[0] || 0);
  if (totalProdutos === 0 && existsSync(legacyFile)) {
    try {
      const antigos = JSON.parse(await fs.readFile(legacyFile, 'utf8'));
      if (Array.isArray(antigos)) for (const produto of antigos) {
        if (produto?.nome && produto?.categoria && Number.isFinite(Number(produto?.preco))) {
          const categoriaId = obterOuCriarCategoriaIdInterno(produto.categoria);
          const stmt = getDb().prepare('INSERT INTO produtos (nome, categoria_id, preco, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)');
          const agora = new Date().toISOString();
          stmt.run([String(produto.nome).trim(), categoriaId, Number(produto.preco), agora, agora]); stmt.free();
        }
      }
    } catch { console.warn('Não foi possível migrar produtos.json; o banco atual será mantido.'); }
  }
}

async function abrirBanco(filename) {
  try {
    return abrirBancoDeBytes(new Uint8Array(await fs.readFile(filename)));
  } catch {
    return null;
  }
}

function abrirBancoDeBytes(bytes) {
  try {
    const candidato = new SQL.Database(bytes);
    candidato.exec('SELECT name FROM sqlite_master LIMIT 1');
    return candidato;
  } catch {
    return null;
  }
}

export async function inicializarBanco() {
  await fs.mkdir(dataDir, { recursive: true });

  if (!SQL) {
    const dist = path.dirname(fileURLToPath(import.meta.resolve('sql.js')));
    const wasmPath = path.join(dist, 'sql-wasm.wasm');
    SQL = await initSqlJs({
      locateFile: () => wasmPath,
    });
  }

  db = null;

  // Com armazenamento remoto, o banco salvo lá tem prioridade sobre o arquivo
  // local (que no StackBlitz volta ao estado do ZIP a cada reinício).
  if (armazenamentoRemotoAtivo()) {
    await prepararRemoto();
    const bytes = await carregarRemoto();
    if (bytes) {
      db = abrirBancoDeBytes(bytes);
      if (!db) throw new Error('O banco salvo no Supabase está corrompido; o servidor não iniciou para não sobrescrevê-lo.');
      console.log('Banco carregado do Supabase Storage.');
    } else {
      console.log('Nenhum banco no Supabase ainda; usando o arquivo local como ponto de partida.');
    }
  }

  if (!db && existsSync(dbFile)) {
    db = await abrirBanco(dbFile);
    if (!db) {
      const backup = `${dbFile}.invalido-${Date.now()}`;
      await fs.copyFile(dbFile, backup).catch(() => {});
      console.warn(`Arquivo data/produtos.sqlite inválido; cópia salva em ${backup} e um novo banco será criado.`);
    }
  }

  if (!db) db = new SQL.Database();

  criarTabelas();
  await migrarSeNecessario();
  criarTabelas();
  semearCategoriasPadrao();
  semearBanhoTosaPadrao();
  semearCuponsPadrao();
  repararProdutosOrfaos();

  let colunasFinais = colunasDe('produtos');
  if (!colunasFinais.includes('imagem')) {
    getDb().run('ALTER TABLE produtos ADD COLUMN imagem TEXT');
    colunasFinais = [...colunasFinais, 'imagem'];
  }
  if (!colunasFinais.includes('categoria_id')) {
    throw new Error('Banco de produtos incompatível: categoria_id não pôde ser migrado.');
  }

  criarIndices();
  await salvarBancoInicializacao();
}
