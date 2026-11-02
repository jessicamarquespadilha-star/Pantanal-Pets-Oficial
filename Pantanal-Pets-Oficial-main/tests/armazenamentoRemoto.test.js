import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Supabase Storage simulado: guarda objetos em memória.
function subirSupabaseFalso() {
  const objetos = new Map();
  const estado = { falhar: false };
  const servidor = http.createServer((req, res) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => {
      const corpo = Buffer.concat(partes);
      const json = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.headers.authorization !== 'Bearer chave-teste') return json(401, { message: 'Invalid JWT' });
      if (req.url === '/storage/v1/bucket' && req.method === 'POST') return json(200, { name: 'loja-pet' });
      const m = req.url.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
      if (!m) return json(404, { message: 'x' });
      const chave = `${m[1]}/${m[2]}`;
      if (estado.falhar) return json(500, { message: 'indisponível' });
      if (req.method === 'POST') { objetos.set(chave, corpo); return json(200, { Key: chave }); }
      if (req.method === 'GET') {
        if (!objetos.has(chave)) return json(400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        return res.end(objetos.get(chave));
      }
      json(405, {});
    });
  });
  return new Promise((ok) => servidor.listen(0, '127.0.0.1', () => ok({ servidor, objetos, estado, url: `http://127.0.0.1:${servidor.address().port}` })));
}

// Cada "reinício" roda em processo novo, com a pasta data zerada (como no StackBlitz).
async function reiniciar(url, acao) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'loja-pet-remoto-'));
  try {
    await fs.cp(path.join(raiz, 'server'), path.join(dir, 'server'), { recursive: true });
    await fs.symlink(path.join(raiz, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    const db = pathToFileURL(path.join(dir, 'server/database.js')).href;
    const script = `
      const { inicializarBanco, criarDAO } = await import(${JSON.stringify(db)});
      await inicializarBanco();
      const dao = criarDAO();
      ${acao}
    `;
    return await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, ['--input-type=module', '-e', script], {
        cwd: dir,
        env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_KEY: 'chave-teste' },
      });
      let out = ''; let err = '';
      p.stdout.on('data', (d) => { out += d; });
      p.stderr.on('data', (d) => { err += d; });
      p.on('close', (code) => (code === 0 ? resolve(out.trim().split('\n').pop()) : reject(new Error(err || out))));
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('dados gravados sobrevivem a um reinício com a pasta data zerada', async () => {
  const falso = await subirSupabaseFalso();
  try {
    await reiniciar(falso.url, `
      const id = dao.obterOuCriarCategoriaId('Teste');
      dao.run("INSERT INTO produtos (nome, categoria_id, preco, criado_em, atualizado_em) VALUES ('Ração Persistente', ?, 10, 'a', 'a')", [id]);
      await dao.salvarBanco();
    `);
    assert.equal(falso.objetos.size, 1);
    const saida = await reiniciar(falso.url, `console.log(JSON.stringify(dao.listarProdutos({}).itens.map(p => p.nome)));`);
    assert.deepEqual(JSON.parse(saida), ['Ração Persistente']);
  } finally {
    falso.servidor.close();
  }
});

test('falha de rede ao carregar NÃO inicia com banco vazio', async () => {
  const falso = await subirSupabaseFalso();
  try {
    await reiniciar(falso.url, `await dao.salvarBanco();`);
    falso.estado.falhar = true;
    await assert.rejects(() => reiniciar(falso.url, `console.log('iniciou');`), /HTTP 500/);
  } finally {
    falso.servidor.close();
  }
});

test('env.js lê configuracao.env (nome sem ponto)', () => {
  const fonte = readFileSync(path.join(raiz, 'server/env.js'), 'utf8');
  assert.match(fonte, /configuracao\.env/);
});

test('segredos Supabase não são carregados de arquivo JS versionado', async () => {
  const { spawnSync } = await import('node:child_process');
  const env = { ...process.env };
  delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e',
    `await import('./server/env.js'); const s = await import('./server/storage.js'); console.log(s.modoArmazenamento());`],
    { cwd: raiz, env, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), 'arquivo-local', r.stderr);
  assert.equal(existsSync(path.join(raiz, 'server/supabase.config.js')), false);
});
