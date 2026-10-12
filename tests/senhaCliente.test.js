import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSenhaCliente, verificarHashSenha } from '../server/security/password.js';

test('senha de cliente é armazenada com PBKDF2 e pode ser verificada', async () => {
  const senha = 'SenhaSegura123!';
  const hash = await hashSenhaCliente(senha);
  assert.match(hash, /^pbkdf2\$310000\$[a-f0-9]{32}\$[a-f0-9]{128}$/i);
  assert.equal(await verificarHashSenha(senha, hash), true);
  assert.equal(await verificarHashSenha('senha-incorreta', hash), false);
});

test('hash de senha PBKDF2 inválido é rejeitado sem erro', async () => {
  assert.equal(await verificarHashSenha('qualquer', 'pbkdf2$1$salt$hash'), false);
});
