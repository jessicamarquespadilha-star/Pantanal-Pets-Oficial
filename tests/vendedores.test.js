import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mensagemDoPedido, NOME_VENDEDOR } from '../frontend/src/lib/vendedores.js'

test('Loja Pet usa somente um atendimento de WhatsApp', () => {
  assert.equal(NOME_VENDEDOR, 'Atendimento Loja Pet')
})

test('mensagem do pedido reúne todos os itens em um único atendimento', () => {
  const mensagem = mensagemDoPedido(
    [
      { nome: 'Coleira', quantidade: 1, preco: 20 },
      { nome: 'Ração', quantidade: 2, preco: 40 },
    ],
    { logradouro: 'Rua A', bairro: 'Centro', localidade: 'Corumbá', uf: 'MS', cep: '79300-000' },
    (valor) => `R$ ${Number(valor).toFixed(2)}`,
  )

  assert.match(mensagem, /Coleira/)
  assert.match(mensagem, /Ração/)
  assert.match(mensagem, /Corumbá - MS/)
})
