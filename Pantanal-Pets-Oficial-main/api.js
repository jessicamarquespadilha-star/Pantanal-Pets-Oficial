/**
 * Compatibilidade legada. A aplicação React usa frontend/src/services/api.js.
 * Este arquivo é mantido para preservar a estrutura original do projeto.
 */
async function tentarUmaVez(path, options) {
  const { body, headers = {}, ...rest } = options
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      credentials: 'include',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor Express.')
  }

  if (response.status === 204) {
    return { response, data: { sucesso: true, dados: null, mensagem: '' } }
  }

  const texto = await response.text().catch(() => '')
  let data = null
  if (texto) {
    try {
      data = JSON.parse(texto)
    } catch {
      data = null
    }
  }

  return { response, data }
}

function respostaValida(data) {
  return Boolean(data) && typeof data === 'object' && typeof data.sucesso !== 'undefined'
}

async function request(path, options = {}) {
  let { response, data } = await tentarUmaVez(path, options)

  if (response.status !== 204 && response.ok && !respostaValida(data)) {
    ;({ response, data } = await tentarUmaVez(path, options))
  }

  if (!response.ok) {
    
    if (response.status === 401 && path !== '/login' && path !== '/login-cliente') {
      window.dispatchEvent(new CustomEvent('sessao-expirada'))
    }
    const codigo = data?.erro?.codigo || 'ERRO_HTTP'
    const mensagem = data?.erro?.mensagem || `Erro HTTP ${response.status}`
    const erro = new Error(mensagem)
    erro.status = response.status
    erro.codigo = codigo
    throw erro
  }

  if (!respostaValida(data)) {
    const erro = new Error('Resposta inesperada do servidor. Tente novamente.')
    erro.status = response.status
    throw erro
  }

  return data
}

export const login = (token) => request('/login', { method: 'POST', body: { access_token: token } })
export const loginCliente = () => request('/login-cliente', { method: 'POST', body: {} })
export const perfil = () => request('/perfil')
export const logout = () => request('/logout', { method: 'POST' })
export const config = () => request('/config')
export const buscarCep = (cep) => request(`/cep/${encodeURIComponent(cep)}`)

export const listarProdutos = ({
  nome = '',
  categoria = '',
  ordem = 'nome',
  precoMin = '',
  precoMax = '',
  pagina = 1,
  porPagina = 10,
} = {}) => {
  const q = new URLSearchParams()
  if (nome.trim()) q.set('nome', nome.trim())
  if (categoria) q.set('categoria', categoria)
  if (ordem) q.set('ordem', ordem)
  if (precoMin !== '') q.set('precoMin', precoMin)
  if (precoMax !== '') q.set('precoMax', precoMax)
  q.set('pagina', pagina)
  q.set('porPagina', porPagina)
  return request(`/produtos?${q}`)
}

export const criarProduto = (p) => request('/produtos', { method: 'POST', body: p })
export const atualizarProduto = (id, p) => request(`/produtos/${id}`, { method: 'PUT', body: p })
export const excluirProduto = (id) => request(`/produtos/${id}`, { method: 'DELETE' })
export const estatisticas = () => request('/estatisticas')
export const categorias = () => request('/categorias')
export const historico = () => request('/historico')
export const limparHistorico = () => request('/historico', { method: 'DELETE' })

export const listarCupons = () => request('/cupons')
export const criarCupom = (c) => request('/cupons', { method: 'POST', body: c })
export const atualizarCupom = (id, c) => request(`/cupons/${id}`, { method: 'PUT', body: c })
export const excluirCupom = (id) => request(`/cupons/${id}`, { method: 'DELETE' })
export const validarCupom = (codigo, produtoIds = []) => request('/cupons/validar', { method: 'POST', body: { codigo, produtoIds } })

export const exportarProdutos = async () => {
  const response = await fetch('/api/exportar', { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível exportar os produtos.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'produtos.csv'
  a.click()
  URL.revokeObjectURL(url)
}
