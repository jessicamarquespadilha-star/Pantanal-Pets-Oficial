import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = readFileSync(path.join(raiz, 'frontend/src/components/BanhoTosa.jsx'), 'utf8');

test('tela admin de Banho e Tosa não usa variáveis da tela do cliente', () => {
  // Regressão: `pagamentoConfirmado` só existe em ClienteBanhoTosa; usá-la no
  // admin gerava ReferenceError ao abrir "Editar agendamento".
  const admin = fonte.slice(fonte.indexOf('function AdminBanhoTosa'));
  assert.doesNotMatch(admin, /pagamentoConfirmado/);
});

test('admin aceita valores com vírgula e atualiza em tempo real', () => {
  assert.match(fonte, /const numeroBR/);
  assert.match(fonte, /banho-tosa-atualizado/);
});

test('loja do cliente não chama setters inexistentes de cupom', () => {
  // Regressão: restou `setCupomAplicado` (cupom único) após migrar para vários cupons.
  const loja = readFileSync(path.join(raiz, 'frontend/src/components/LojaCliente.jsx'), 'utf8');
  assert.doesNotMatch(loja, /setCupomAplicado\b/);
});
