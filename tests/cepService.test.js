import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buscarEnderecoPorCep, cepValido, normalizarCep } from '../server/services/cepService.js'

const fetchOriginal = globalThis.fetch

function respostaJson(dados, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return dados
    },
  }
}

test.afterEach(() => {
  globalThis.fetch = fetchOriginal
})

test('normalizarCep remove máscara e caracteres não numéricos', () => {
  assert.equal(normalizarCep('79.300-000'), '79300000')
})

test('cepValido aceita exatamente oito dígitos', () => {
  assert.equal(cepValido('79300000'), true)
  assert.equal(cepValido('79300-000'), true)
  assert.equal(cepValido('7930000'), false)
  assert.equal(cepValido('793000000'), false)
})

test('buscarEnderecoPorCep consulta a API externa e trata os dados', async () => {
  let url = ''
  globalThis.fetch = async (endpoint) => {
    url = endpoint
    return respostaJson({
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
      estado: 'São Paulo',
      regiao: 'Sudeste',
      ibge: '3550308',
    })
  }

  const endereco = await buscarEnderecoPorCep('01001000')

  assert.equal(url, 'https://viacep.com.br/ws/01001000/json/')
  assert.deepEqual(endereco, {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    complemento: 'lado ímpar',
    bairro: 'Sé',
    localidade: 'São Paulo',
    uf: 'SP',
    estado: 'São Paulo',
    regiao: 'Sudeste',
  })
})

test('buscarEnderecoPorCep rejeita CEP inválido antes do fetch', async () => {
  let chamouFetch = false
  globalThis.fetch = async () => {
    chamouFetch = true
    return respostaJson({})
  }

  await assert.rejects(
    () => buscarEnderecoPorCep('123'),
    (error) => error.status === 400 && error.codigo === 'CEP_INVALIDO'
  )
  assert.equal(chamouFetch, false)
})

test('buscarEnderecoPorCep trata CEP inexistente', async () => {
  globalThis.fetch = async () => respostaJson({ erro: true })

  await assert.rejects(
    () => buscarEnderecoPorCep('99999999'),
    (error) => error.status === 404 && error.codigo === 'CEP_NAO_ENCONTRADO'
  )
})

test('buscarEnderecoPorCep trata falha HTTP da API externa', async () => {
  globalThis.fetch = async () => respostaJson({}, 503)

  await assert.rejects(
    () => buscarEnderecoPorCep('01001000'),
    (error) => error.status === 502 && error.codigo === 'API_EXTERNA_INDISPONIVEL'
  )
})

test('cidadeAtendida ignora acentos e diferencia cidades não atendidas', async () => {
  const { cidadeAtendida } = await import('../server/services/cepService.js')
  assert.equal(cidadeAtendida('Corumbá', ['Corumba', 'Ladário']), true)
  assert.equal(cidadeAtendida('Campo Grande', ['Corumbá', 'Ladário']), false)
  assert.equal(cidadeAtendida('São Paulo', ['Corumbá', 'Ladário']), false)
})
