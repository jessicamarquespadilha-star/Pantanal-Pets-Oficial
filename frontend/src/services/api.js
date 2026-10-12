// No StackBlitz, usa o backend oficial do Render para não criar um segundo banco local.
// VITE_API_URL continua permitindo sobrescrever o endereço em outros ambientes.
const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('.webcontainer.io')
      ? 'https://pantanal-pets.onrender.com'
      : '')
).replace(/\/$/, '')

const ROTAS_SEM_EXPIRACAO = new Set(['/login', '/login-cliente', '/cadastro-cliente', '/perfil', '/recuperar-senha', '/redefinir-senha'])

async function tentarUmaVez(path, options) {
  const { body, headers = {}, ...rest } = options
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
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

  // Sempre tenta interpretar como JSON, sem depender do header content-type
  // (alguns proxies/ambientes de preview reescrevem ou omitem esse header).
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

  // Resposta 2xx com corpo vazio/ilegível costuma ser uma falha transitória de
  // rede do próprio ambiente de preview — tenta mais uma vez antes de desistir.
  if (response.status !== 204 && response.ok && !respostaValida(data)) {
    ;({ response, data } = await tentarUmaVez(path, options))
  }

  if (!response.ok) {
    // Dispara um evento global de sessão expirada, exceto no próprio login
    // (onde um 401 só significa "token incorreto", não sessão perdida).
    if (response.status === 401 && !ROTAS_SEM_EXPIRACAO.has(path)) {
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

export const login = (accessToken) => request('/login', { method: 'POST', body: { access_token: accessToken } })
export const loginCliente = (credenciais) => request('/login-cliente', { method: 'POST', body: credenciais })
export const cadastrarCliente = (dados) => request('/cadastro-cliente', { method: 'POST', body: dados })
export const recuperarSenha = (email) => request('/recuperar-senha', { method: 'POST', body: { email } })
export const redefinirSenha = (token, senha) => request('/redefinir-senha', { method: 'POST', body: { token, senha } })
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
export const validarCupom = (codigo, produtoIds = []) =>
  request('/cupons/validar', { method: 'POST', body: { codigo, produtoIds } })

export const listarOpcoesBanhoTosa = () => request('/banho-tosa/opcoes')
export const listarGestaoBanhoTosa = () => request('/banho-tosa/gestao')
export const criarServicoBanho = (dados) => request('/banho-tosa/servicos', { method: 'POST', body: dados })
export const atualizarServicoBanho = (id, dados) => request(`/banho-tosa/servicos/${id}`, { method: 'PUT', body: dados })
export const excluirServicoBanho = (id) => request(`/banho-tosa/servicos/${id}`, { method: 'DELETE' })
export const criarVeiculoBanho = (dados) => request('/banho-tosa/veiculos', { method: 'POST', body: dados })
export const atualizarVeiculoBanho = (id, dados) => request(`/banho-tosa/veiculos/${id}`, { method: 'PUT', body: dados })
export const excluirVeiculoBanho = (id) => request(`/banho-tosa/veiculos/${id}`, { method: 'DELETE' })

export const criarAgendamento = (dados) => request('/agendamentos-banho-tosa', { method: 'POST', body: dados })
export const listarAgendamentos = () => request('/agendamentos-banho-tosa')
export const listarHorariosOcupados = (data) => request(`/agendamentos-banho-tosa/ocupados?data=${encodeURIComponent(data)}`)
export const atualizarAgendamento = (id, dados) => request(`/agendamentos-banho-tosa/${id}`, { method: 'PUT', body: dados })
export const excluirAgendamento = (id) => request(`/agendamentos-banho-tosa/${id}`, { method: 'DELETE' })

export const exportarProdutos = async () => {
  const response = await fetch(`${API_BASE_URL}/api/exportar`, { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível exportar os produtos.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'produtos.csv'
  a.click()
  URL.revokeObjectURL(url)
}