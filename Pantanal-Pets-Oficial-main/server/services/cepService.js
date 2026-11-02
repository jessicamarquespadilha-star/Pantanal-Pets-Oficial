const URL_BASE = 'https://viacep.com.br/ws';
const TIMEOUT_MS = 5000;

const ESTADOS_ATENDIDOS = ['MS'];

export function normalizarCep(cep) {
  return String(cep ?? '').replace(/\D/g, '');
}

export function cepValido(cep) {
  return /^\d{8}$/.test(normalizarCep(cep));
}

export async function buscarEnderecoPorCep(cep) {
  const cepNormalizado = normalizarCep(cep);
  if (!cepValido(cepNormalizado)) {
    const erro = new Error('Informe um CEP válido com 8 dígitos.');
    erro.status = 400;
    erro.codigo = 'CEP_INVALIDO';
    throw erro;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${URL_BASE}/${cepNormalizado}/json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const erro = new Error('A API ViaCEP não respondeu corretamente.');
      erro.status = 502;
      erro.codigo = 'API_EXTERNA_INDISPONIVEL';
      throw erro;
    }

    const data = await response.json();

    if (data?.erro) {
      const erro = new Error('CEP não encontrado na API ViaCEP.');
      erro.status = 404;
      erro.codigo = 'CEP_NAO_ENCONTRADO';
      throw erro;
    }

    const uf = (data?.uf || '').toUpperCase();

    if (!ESTADOS_ATENDIDOS.includes(uf)) {
      const erro = new Error(`Atenção: A entrega via transportadora é realizada apenas dentro do estado de Mato Grosso do Sul (MS). A sua região (${uf}) ainda não é atendida.`);
      erro.status = 400;
      erro.codigo = 'REGIAO_NAO_ATENDIDA';
      throw erro;
    }

    return {
      cep: data?.cep || cepNormalizado,
      logradouro: data?.logradouro || '',
      complemento: data?.complemento || '',
      bairro: data?.bairro || '',
      localidade: data?.localidade || '',
      uf,
      estado: data?.estado || '',
      regiao: data?.regiao || '',
      atendido: true,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const erro = new Error('A consulta ao serviço de CEP demorou demais.');
      erro.status = 504;
      erro.codigo = 'API_EXTERNA_TIMEOUT';
      throw erro;
    }
    if (error?.status) throw error;
    const erro = new Error('Não foi possível consultar a API ViaCEP.');
    erro.status = 502;
    erro.codigo = 'API_EXTERNA_INDISPONIVEL';
    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}