import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Persistência do arquivo SQLite.
 *
 * O StackBlitz (WebContainer) NÃO guarda arquivos gravados em tempo de
 * execução: ao recarregar, reiniciar ou fazer fork, `data/produtos.sqlite`
 * volta ao que veio no projeto. Por isso, quando as variáveis SUPABASE_*
 * estão definidas, o banco é guardado no Supabase Storage (bucket privado) e
 * recarregado a cada inicialização. Sem elas, o comportamento antigo (arquivo
 * local) é mantido, o que serve para o Render com disco persistente.
 *
 * Só usa `fetch` (HTTP), então funciona dentro do StackBlitz.
 */

const TIMEOUT_MS = 20000;

function config() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const chave = String(process.env.SUPABASE_SERVICE_KEY || '').trim();
  return {
    url,
    chave,
    bucket: String(process.env.SUPABASE_BUCKET || 'loja-pet').trim(),
    objeto: String(process.env.SUPABASE_OBJECT || 'produtos.sqlite').trim(),
    ativo: Boolean(url && chave),
  };
}

export function armazenamentoRemotoAtivo() {
  return config().ativo;
}

export function modoArmazenamento() {
  return config().ativo ? 'supabase-storage' : 'arquivo-local';
}

function cabecalhos(extra = {}) {
  const { chave } = config();
  return { Authorization: `Bearer ${chave}`, apikey: chave, ...extra };
}

async function pedir(url, opcoes) {
  return fetch(url, { ...opcoes, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

function urlObjeto(c) {
  const caminho = c.objeto.split('/').map(encodeURIComponent).join('/');
  return `${c.url}/storage/v1/object/${encodeURIComponent(c.bucket)}/${caminho}`;
}

/** Cria o bucket privado se ele ainda não existir. */
export async function prepararRemoto() {
  const c = config();
  if (!c.ativo) return;
  const r = await pedir(`${c.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: cabecalhos({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: c.bucket, name: c.bucket, public: false }),
  });
  if (r.ok) return;
  const corpo = await r.text();
  if (r.status === 409 || /already exists|duplicate/i.test(corpo)) return;
  if (r.status === 401 || r.status === 403) {
    throw new Error(`Supabase recusou a chave (HTTP ${r.status}). Use a chave "service_role" em SUPABASE_SERVICE_KEY.`);
  }
  throw new Error(`Não foi possível preparar o bucket "${c.bucket}" (HTTP ${r.status}): ${corpo}`);
}

/**
 * Baixa o banco salvo. Retorna Uint8Array, ou null se ainda não existe.
 * Qualquer outra falha lança erro: nunca devemos iniciar com um banco vazio
 * por causa de uma falha de rede e depois sobrescrever os dados reais.
 */
export async function carregarRemoto() {
  const c = config();
  if (!c.ativo) return null;
  const r = await pedir(urlObjeto(c), { headers: cabecalhos() });
  if (r.ok) return new Uint8Array(await r.arrayBuffer());
  const corpo = await r.text();
  if (r.status === 404 || /not.?found/i.test(corpo)) return null;
  throw new Error(`Falha ao baixar o banco do Supabase (HTTP ${r.status}): ${corpo}`);
}

async function enviarRemoto(bytes) {
  const c = config();
  const r = await pedir(urlObjeto(c), {
    method: 'POST',
    headers: cabecalhos({ 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' }),
    body: bytes,
  });
  if (!r.ok) throw new Error(`Falha ao gravar o banco no Supabase (HTTP ${r.status}): ${await r.text()}`);
}

async function gravarLocal(arquivo, bytes) {
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  const temporario = `${arquivo}.${process.pid}.tmp`;
  await fs.writeFile(temporario, Buffer.from(bytes));
  await fs.rename(temporario, arquivo);
}

/**
 * Grava o snapshot. Com Supabase ativo, o remoto é a fonte da verdade (2
 * tentativas) e a cópia local é só cache. Sem Supabase, grava só o arquivo.
 */
export async function gravarSnapshot(bytes, arquivoLocal) {
  if (config().ativo) {
    try {
      await enviarRemoto(bytes);
    } catch (primeiro) {
      console.warn('Gravação remota falhou, tentando de novo:', primeiro.message);
      await enviarRemoto(bytes);
    }
    await gravarLocal(arquivoLocal, bytes).catch(() => {});
    return;
  }
  await gravarLocal(arquivoLocal, bytes);
}
