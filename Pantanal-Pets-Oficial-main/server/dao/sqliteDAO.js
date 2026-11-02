import fs from 'node:fs/promises';
import { capitalizar } from '../util.js';
import { produtoDaLinha, SELECT_PRODUTO } from '../models/produtoModel.js';

/**
 * DAO (Data Access Object) da aplicação.
 *
 * Controllers não conhecem a conexão SQLite nem o caminho físico do banco.
 * Toda operação de leitura/escrita e persistência em arquivo passa por esta
 * camada. O módulo database.js fica responsável apenas pela inicialização,
 * migração e configuração do schema.
 */
export class SQLiteDAO {
  constructor(getDatabase, { filePath, persistir } = {}) {
    this.getDatabase = getDatabase;
    this.filePath = filePath;
    this.persistir = persistir;
    this.dbWriteQueue = Promise.resolve();
  }

  /** Linhas afetadas pelo último INSERT/UPDATE/DELETE. */
  linhasAfetadas() {
    return this.getDatabase().getRowsModified();
  }

  exec(sql) {
    return this.getDatabase().exec(sql);
  }

  prepare(sql) {
    return this.getDatabase().prepare(sql);
  }

  run(sql, params = []) {
    const statement = this.getDatabase().prepare(sql);
    try { statement.run(params); } finally { statement.free(); }
  }

  one(sql, params = []) {
    const statement = this.getDatabase().prepare(sql);
    try { statement.bind(params); return statement.step() ? statement.getAsObject() : null; } finally { statement.free(); }
  }

  all(sql, params = []) {
    const statement = this.getDatabase().prepare(sql);
    const rows = [];
    try { statement.bind(params); while (statement.step()) rows.push(statement.getAsObject()); return rows; } finally { statement.free(); }
  }

  buscarProdutoPorId(id) {
    const row = this.one(`${SELECT_PRODUTO} WHERE p.id = ?`, [id]);
    return row ? produtoDaLinha(row) : null;
  }

  todosProdutos() {
    return this.all(`${SELECT_PRODUTO} ORDER BY p.id DESC`).map(produtoDaLinha);
  }

  listarProdutos({
    nome = '',
    categoria = '',
    precoMin = null,
    precoMax = null,
    ordem = 'nome',
    pagina = 1,
    porPagina = 10,
  } = {}) {
    // Validação rápida do esquema antes da primeira consulta. Se um banco
    // antigo for montado por algum ambiente de deploy, o erro fica explícito
    // no log em vez de virar um 500 genérico durante a consulta.
    const schema = this.all('PRAGMA table_info(produtos)');
    const colunas = new Set(schema.map((coluna) => coluna.name));
    const obrigatorias = ['id', 'nome', 'categoria_id', 'preco', 'imagem', 'criado_em', 'atualizado_em'];
    const ausentes = obrigatorias.filter((coluna) => !colunas.has(coluna));
    if (ausentes.length) {
      throw new Error(`Esquema de produtos incompleto. Colunas ausentes: ${ausentes.join(', ')}`);
    }

    // Normaliza novamente os parâmetros aqui. O DAO é a última fronteira
    // antes do SQLite e não deve depender de como o Controller recebeu os
    // valores da query string.
    const termoNome = String(nome ?? '').trim().toLowerCase();
    const termoCategoria = String(categoria ?? '').trim().toLowerCase();
    const limite = Number.isInteger(Number(porPagina)) && Number(porPagina) > 0
      ? Math.min(50, Number(porPagina))
      : 10;
    const paginaSolicitada = Number.isInteger(Number(pagina)) && Number(pagina) > 0
      ? Number(pagina)
      : 1;

    let where = '';
    const params = [];

    if (termoNome) {
      where += ' WHERE (LOWER(p.nome) LIKE ? OR LOWER(c.nome) LIKE ?)';
      params.push(`%${termoNome}%`, `%${termoNome}%`);
    }

    if (termoCategoria) {
      where += where ? ' AND LOWER(c.nome) = ?' : ' WHERE LOWER(c.nome) = ?';
      params.push(termoCategoria);
    }

    const minimo = Number(precoMin);
    if (precoMin !== null && precoMin !== '' && Number.isFinite(minimo)) {
      where += where ? ' AND p.preco >= ?' : ' WHERE p.preco >= ?';
      params.push(minimo);
    }

    const maximo = Number(precoMax);
    if (precoMax !== null && precoMax !== '' && Number.isFinite(maximo)) {
      where += where ? ' AND p.preco <= ?' : ' WHERE p.preco <= ?';
      params.push(maximo);
    }

    const ordenacoes = {
      nome: 'p.nome COLLATE NOCASE ASC, p.id ASC',
      'preco-asc': 'p.preco ASC, p.id ASC',
      'preco-desc': 'p.preco DESC, p.id DESC',
      'id-desc': 'p.id DESC',
      'id-asc': 'p.id ASC',
    };
    const ordenacaoSql = ordenacoes[String(ordem)] || ordenacoes.nome;

    // Faz a contagem separadamente. Além de deixar a consulta principal
    // simples, isso evita problemas de binding quando não existem produtos.
    const totalRow = this.one(
      `SELECT COUNT(*) AS total
         FROM produtos p
         LEFT JOIN categorias c ON c.id = p.categoria_id${where}`,
      params
    );
    const total = Number(totalRow?.total ?? 0);
    const totalPaginas = total === 0 ? 1 : Math.ceil(total / limite);
    const paginaFinal = Math.min(paginaSolicitada, totalPaginas);
    const offset = (paginaFinal - 1) * limite;

    let rows = [];
    if (total > 0) {
      rows = this.all(
        `${SELECT_PRODUTO}${where} ORDER BY ${ordenacaoSql} LIMIT ? OFFSET ?`,
        [...params, limite, offset]
      );
    }

    return {
      itens: rows.map(produtoDaLinha),
      total,
      pagina: paginaFinal,
      porPagina: limite,
      totalPaginas,
    };
  }

  obterOuCriarCategoriaId(nomeInformado) {
    const nome = capitalizar(nomeInformado);
    if (!nome) return null;

    const existente = this.one(
      'SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)',
      [nome]
    );
    if (existente) return Number(existente.id);

    this.run('INSERT INTO categorias (nome) VALUES (?)', [nome]);
    return Number(this.one('SELECT last_insert_rowid() AS id').id);
  }

  registrarHistorico(tipo, produtoId, produtoNome, detalhes) {
    const agora = new Date().toISOString();
    this.run(
      `
        INSERT INTO historico (tipo, produto_id, produto_nome, detalhes, criado_em)
        VALUES (?, ?, ?, ?, ?)
      `,
      [tipo, produtoId, produtoNome, detalhes || null, agora]
    );
  }

  /**
   * Persiste o banco SQLite/WASM. As gravações entram numa fila para não se
   * sobreporem; o export acontece só quando chega a vez, então sempre vale o
   * estado mais recente.
   */
  salvarBanco() {
    const tarefa = this.dbWriteQueue.then(() => this.gravarAgora());
    this.dbWriteQueue = tarefa.catch(() => {});
    return tarefa;
  }

  async gravarAgora() {
    const db = this.getDatabase();
    if (typeof db.export !== 'function') {
      throw new Error('Banco SQLite não oferece exportação para persistência.');
    }
    const dados = db.export();
    if (this.persistir) return this.persistir(dados);
    await fs.writeFile(this.filePath, Buffer.from(dados));
  }
}
