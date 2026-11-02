import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarProduto, capitalizar, paginaValida, porPaginaValido, validarCupom } from '../server/util.js'

test('validarProduto aceita um produto válido', () => {
  const erro = validarProduto({ nome: 'Ração', categoria: 'Alimentação', preco: 89.9 })
  assert.equal(erro, null)
})

test('validarProduto exige nome', () => {
  const erro = validarProduto({ nome: '  ', categoria: 'Alimentação', preco: 10 })
  assert.equal(erro, 'O nome é obrigatório.')
})

test('validarProduto exige categoria', () => {
  const erro = validarProduto({ nome: 'Ração', categoria: '', preco: 10 })
  assert.equal(erro, 'A categoria é obrigatória.')
})

test('validarProduto rejeita preço negativo', () => {
  const erro = validarProduto({ nome: 'Ração', categoria: 'Alimentação', preco: -1 })
  assert.equal(erro, 'O preço deve ser um número maior ou igual a zero.')
})

test('validarProduto rejeita preço não numérico', () => {
  const erro = validarProduto({ nome: 'Ração', categoria: 'Alimentação', preco: 'abc' })
  assert.equal(erro, 'O preço deve ser um número maior ou igual a zero.')
})

test('validarProduto rejeita nome muito longo', () => {
  const erro = validarProduto({ nome: 'a'.repeat(121), categoria: 'Alimentação', preco: 10 })
  assert.equal(erro, 'O nome deve ter no máximo 120 caracteres.')
})

test('capitalizar normaliza variações de caixa', () => {
  assert.equal(capitalizar('ALIMENTAÇÃO'), 'Alimentação')
  assert.equal(capitalizar('alimentação'), 'Alimentação')
  assert.equal(capitalizar('  acessório  '), 'Acessório')
  assert.equal(capitalizar(''), '')
})

test('paginaValida usa 1 como padrão para valores inválidos', () => {
  assert.equal(paginaValida(undefined), 1)
  assert.equal(paginaValida('abc'), 1)
  assert.equal(paginaValida(0), 1)
  assert.equal(paginaValida(3), 3)
})

test('porPaginaValido respeita o máximo permitido', () => {
  assert.equal(porPaginaValido(undefined), 10)
  assert.equal(porPaginaValido(500, 50), 50)
  assert.equal(porPaginaValido(5, 50), 5)
})


test('validarCupom aceita cupom de 24 horas', () => {
  assert.equal(validarCupom({ codigo: 'PET24', tipo: 'percentual', valor: 10, validadeTipo: '24h' }), null)
})

test('validarCupom rejeita percentual acima de 100', () => {
  assert.equal(validarCupom({ codigo: 'PET101', tipo: 'percentual', valor: 101, validadeTipo: '24h' }), 'O desconto percentual não pode passar de 100%.')
})

test('validarCupom exige término futuro para validade personalizada', () => {
  assert.equal(validarCupom({ codigo: 'PETFUTURO', tipo: 'fixo', valor: 10, validadeTipo: 'personalizada', validadeFim: '2000-01-01T00:00:00.000Z' }), 'O horário de término deve ser futuro.')
})
