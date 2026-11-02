import fs from 'node:fs';
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function arquivo(rel) {
  return path.join(root, rel)
}

test('arquitetura possui camadas de routes, controllers, models e DAO', () => {
  assert.equal(existsSync(arquivo('server/routes/apiRoutes.js')), true)
  assert.equal(existsSync(arquivo('server/controllers/apiController.js')), true)
  assert.equal(existsSync(arquivo('server/models/produtoModel.js')), true)
  assert.equal(existsSync(arquivo('server/models/cupomModel.js')), true)
  assert.equal(existsSync(arquivo('server/dao/sqliteDAO.js')), true)
})

test('DAO encapsula o acesso ao SQLite', () => {
  const conteudo = readFileSync(arquivo('server/dao/sqliteDAO.js'), 'utf8')
  assert.match(conteudo, /export class SQLiteDAO/)
  assert.match(conteudo, /prepare\(sql\)/)
  assert.match(conteudo, /all\(sql, params = \[\]\)/)
})

test('backend possui CORS explícito e configuração de origem', () => {
  const conteudo = readFileSync(arquivo('server/index.js'), 'utf8')
  assert.match(conteudo, /FRONTEND_URL/)
  assert.match(conteudo, /Access-Control-Allow-Origin/)
  assert.match(conteudo, /Access-Control-Allow-Credentials/)
  assert.match(conteudo, /Access-Control-Allow-Methods/)
})

test('README documenta API, MVC, DAO, CORS e deploy', () => {
  const conteudo = readFileSync(arquivo('README.md'), 'utf8')
  for (const termo of ['MVC', 'DAO', 'CORS', 'GET', 'POST', 'PUT', 'DELETE', 'Deploy', 'Credenciais de teste']) {
    assert.match(conteudo, new RegExp(termo, 'i'))
  }
})

test('cliente tem cadastro e login próprios, sem token administrativo', () => {
  const controller = readFileSync(arquivo('server/controllers/apiController.js'), 'utf8')
  const database = readFileSync(arquivo('server/database.js'), 'utf8')
  const senha = readFileSync(arquivo('server/security/password.js'), 'utf8')
  const login = readFileSync(arquivo('frontend/src/components/Login.jsx'), 'utf8')
  const api = readFileSync(arquivo('frontend/src/services/api.js'), 'utf8')
  assert.match(controller, /app\.post\('\/api\/cadastro-cliente'/)
  assert.match(controller, /app\.post\('\/api\/login-cliente'/)
  assert.match(controller, /autenticarCliente\(req\.body \|\| \{\}\)/)
  assert.match(database, /CREATE TABLE IF NOT EXISTS clientes/)
  assert.match(senha, /PBKDF2_ITERATIONS/)
  assert.match(senha, /subtle\.deriveBits/)
  assert.match(database, /await hashSenhaCliente\(senhaTexto\)/)
  assert.match(login, /Entrar como cliente/)
  assert.match(login, /Ainda não tenho conta — cadastrar/)
  assert.match(login, /Token de acesso/)
  assert.doesNotMatch(login, /Token de acesso do cliente/)
  assert.match(api, /loginCliente = \(credenciais\) => request\('\/login-cliente'/)
  assert.match(api, /cadastrarCliente = \(dados\) => request\('\/cadastro-cliente'/)
})

test('configuração de produção não usa segredo padrão', () => {
  const servidor = readFileSync(arquivo('server/index.js'), 'utf8')
  assert.match(servidor, /NODE_ENV === 'production'/)
  assert.match(servidor, /defina ACCESS_TOKEN e SESSION_SECRET/)
})

test('WebSocket de atualizações em tempo real está exposto pelo servidor', () => {
  const index = fs.readFileSync(path.join(root, 'server', 'index.js'), 'utf8');
  assert.match(index, /req\.url === '\/ws'/);
  assert.match(index, /Sec-WebSocket-Accept/);
  assert.match(index, /emitirAtualizacao/);
});

test('Controller usa o DAO para operações de persistência', () => {
  const controller = fs.readFileSync(path.join(root, 'server', 'controllers', 'apiController.js'), 'utf8');
  assert.doesNotMatch(controller, /import\s+\{[^}]*\b(salvarBanco|buscarProdutoPorId|todosProdutos|obterOuCriarCategoriaId|registrarHistorico)\b[^}]*\}\s+from ['"]\.\.\/database\.js['"]/s);
  assert.match(controller, /dao\.salvarBanco\(\)/);
  assert.match(controller, /dao\.buscarProdutoPorId\(/);
  assert.match(controller, /dao\.obterOuCriarCategoriaId\(/);
});

test('login administrativo rejeita token ausente e CORS não reflete origens arbitrárias', () => {
  const controller = readFileSync(arquivo('server/controllers/apiController.js'), 'utf8');
  const servidor = readFileSync(arquivo('server/index.js'), 'utf8');
  assert.match(controller, /typeof token !== 'string' \|\| !token\.trim\(\) \|\| !ACCESS_TOKEN \|\| token !== ACCESS_TOKEN/);
  assert.match(servidor, /FRONTEND_URLS\.includes\(origem\)/);
  assert.doesNotMatch(servidor, /const permitida = FRONTEND_URL \|\| origem/);
});

test('interface encaminha o token digitado para o endpoint administrativo', () => {
  const app = readFileSync(arquivo('frontend/src/App.jsx'), 'utf8');
  const api = readFileSync(arquivo('frontend/src/services/api.js'), 'utf8');
  assert.match(app, /async function entrar\(token\)/);
  assert.match(app, /login\(token\)/);
  assert.match(api, /login = \(accessToken\) => request\('\/login'.*access_token: accessToken/s);
});
