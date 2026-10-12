import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Cada cenário roda em um processo isolado, pois database.js usa um banco
// singleton e um diretório `data` fixo relativo ao projeto.
async function executar(preparar) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'loja-pet-'));
  try {
    await fs.cp(path.join(raiz, 'server'), path.join(dir, 'server'), { recursive: true });
    await fs.symlink(path.join(raiz, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    await fs.mkdir(path.join(dir, 'data'));
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    const script = `
      import fs from 'node:fs';
      import initSqlJs from ${JSON.stringify(pathToFileURL(path.join(raiz, 'node_modules/sql.js/dist/sql-wasm.js')).href)};
      const SQL = await initSqlJs();
      const bd = new SQL.Database();
      bd.exec = bd.exec.bind(bd);
      ${preparar}
      await fs.promises.writeFile('data/produtos.sqlite', Buffer.from(bd.export()));
      bd.close();
      const { inicializarBanco, criarDAO } = await import(${JSON.stringify(
        pathToFileURL(path.join(dir, 'server/database.js')).href
      )});
      await inicializarBanco();
      console.log(JSON.stringify(criarDAO().listarProdutos({})));
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout.trim().split('\n').pop());
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('GET /api/produtos: banco antigo com coluna `categoria` é migrado sem erro', async () => {
  const r = await executar(`
    bd.exec("CREATE TABLE produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, categoria TEXT, preco REAL)");
    bd.exec("INSERT INTO produtos (nome,categoria,preco) VALUES ('Ração','alimentação',10), ('Coleira','',5)");
  `);
  assert.equal(r.total, 2);
  assert.deepEqual(r.itens.map((p) => p.categoria).sort(), ['Alimentação', 'Sem categoria']);
});

test('GET /api/produtos: produto com categoria inexistente continua listado', async () => {
  const r = await executar(`
    bd.exec("CREATE TABLE categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE)");
    bd.exec("CREATE TABLE produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, categoria_id INTEGER NOT NULL, preco REAL NOT NULL, imagem TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)");
    bd.exec("INSERT INTO produtos (nome,categoria_id,preco,criado_em,atualizado_em) VALUES ('Ração',99,10,'x','x')");
  `);
  assert.equal(r.total, 1);
  assert.equal(r.itens[0].categoria, 'Sem categoria');
});
