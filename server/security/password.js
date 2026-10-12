import { scryptSync, timingSafeEqual } from 'node:crypto';

const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_HASH_BITS = 512;

function bytesParaHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexParaBytes(hex) {
  if (typeof hex !== 'string' || !/^(?:[a-f0-9]{2})+$/i.test(hex)) {
    throw new Error('Formato hexadecimal inválido.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derivarHashSenha(senha, saltHex, iterations = PBKDF2_ITERATIONS) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.deriveBits !== 'function') {
    throw new Error('Web Crypto não está disponível neste ambiente. Atualize o navegador/Node.js.');
  }

  const chave = await subtle.importKey(
    'raw',
    new TextEncoder().encode(String(senha)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexParaBytes(saltHex),
      iterations,
      hash: 'SHA-256',
    },
    chave,
    PBKDF2_HASH_BITS
  );
  return bytesParaHex(new Uint8Array(bits));
}

export async function hashSenhaCliente(senha) {
  // Usa Web Crypto em vez de scryptSync, que falha no crypto shim do StackBlitz.
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const saltHex = bytesParaHex(salt);
  const hashHex = await derivarHashSenha(senha, saltHex);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

function compararHexConstante(esperadoHex, recebidoHex) {
  if (
    typeof esperadoHex !== 'string' ||
    typeof recebidoHex !== 'string' ||
    esperadoHex.length !== recebidoHex.length
  ) return false;

  let diferenca = 0;
  for (let i = 0; i < esperadoHex.length; i++) {
    diferenca |= esperadoHex.charCodeAt(i) ^ recebidoHex.charCodeAt(i);
  }
  return diferenca === 0;
}

export async function verificarHashSenha(senha, hashArmazenado) {
  if (typeof hashArmazenado !== 'string') return false;

  const partes = hashArmazenado.split('$');
  if (partes.length === 4 && partes[0] === 'pbkdf2') {
    const iterations = Number(partes[1]);
    const saltHex = partes[2];
    const hashHex = partes[3];
    if (
      !Number.isInteger(iterations) ||
      iterations < 100_000 ||
      iterations > 1_000_000 ||
      !/^[a-f0-9]{32}$/i.test(saltHex) ||
      !/^[a-f0-9]{128}$/i.test(hashHex)
    ) return false;

    const tentativa = await derivarHashSenha(senha, saltHex, iterations);
    return compararHexConstante(hashHex.toLowerCase(), tentativa.toLowerCase());
  }

  // Compatibilidade com contas antigas criadas com scrypt em Node.js nativo.
  // Em WebContainer, o shim pode não oferecer scryptSync; nesse caso, o login
  // falha de forma segura em vez de derrubar o endpoint.
  const [salt, hashHex] = hashArmazenado.split(':');
  if (!salt || !/^[a-f0-9]{128}$/i.test(hashHex || '')) return false;
  try {
    const tentativa = scryptSync(senha, salt, 64);
    const hashAntigo = Buffer.from(hashHex, 'hex');
    return hashAntigo.length === tentativa.length && timingSafeEqual(hashAntigo, tentativa);
  } catch {
    return false;
  }
}
