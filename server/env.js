import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Carrega variáveis de ambiente de arquivos na raiz do projeto, sem depender
 * de bibliotecas nem da versão do Node. Variáveis já definidas no ambiente têm
 * prioridade, e entre os arquivos vale o primeiro da lista.
 *
 * `configuracao.env` existe porque alguns ambientes (como o StackBlitz) ocultam
 * ou descartam arquivos cujo nome começa com ponto, como `.env`.
 *
 * Deve ser o primeiro import de server/index.js.
 */
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVOS = ['.env', 'configuracao.env'];

for (const nome of ARQUIVOS) {
  const arquivo = path.join(raiz, nome);
  if (!fs.existsSync(arquivo)) continue;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) continue;
    const i = texto.indexOf('=');
    if (i < 1) continue;
    const chave = texto.slice(0, i).trim();
    let valor = texto.slice(i + 1).trim();
    if (/^(".*"|'.*')$/.test(valor)) valor = valor.slice(1, -1);
    if (process.env[chave] === undefined) process.env[chave] = valor;
  }
}

// Segredos devem vir exclusivamente do ambiente; nunca são carregados de arquivos JS versionados.
