import test from 'node:test';
import assert from 'node:assert/strict';
import { motivoIndisponivel, agoraNaLoja } from '../server/agendamentoRegras.js';

const agora = { data: '2026-10-10', hora: '10:30' };

test('data e horário livres são aceitos', () => {
  assert.equal(motivoIndisponivel('2026-10-20', '09:00', agora), '');
  assert.equal(motivoIndisponivel('2026-10-10', '11:00', agora), '');
});

test('rejeita data inválida, horário inválido e datas que já passaram', () => {
  assert.match(motivoIndisponivel('abc', '09:00', agora), /data válida/);
  assert.match(motivoIndisponivel('2026-02-31', '09:00', agora), /data válida/);
  assert.match(motivoIndisponivel('2026-10-20', '09:30', agora), /horário válido/);
  assert.match(motivoIndisponivel('2026-10-09', '09:00', agora), /ainda não passaram/);
  assert.match(motivoIndisponivel('2026-10-10', '10:00', agora), /ainda não passaram/);
});

test('rejeita feriados e dias sem vaga', () => {
  assert.match(motivoIndisponivel('2026-11-02', '09:00', agora), /feriado: Finados/);
  assert.match(motivoIndisponivel('2026-11-04', '09:00', agora), /Sem horário disponível/);
});

test('agoraNaLoja devolve data e hora no formato esperado', () => {
  const r = agoraNaLoja(new Date('2026-10-10T01:30:00Z'));
  assert.deepEqual(r, { data: '2026-10-09', hora: '21:30' });
});
