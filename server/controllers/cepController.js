import {
  buscarEnderecoPorCep,
  normalizarCep,
  cepValido,
  cidadeAtendida,
} from '../services/cepService.js';

export async function consultarCep(req, res, next) {
  try {
    const cep = normalizarCep(req.params.cep);

    // A validação fica no Controller para que a camada de entrada rejeite
    // requisições inválidas antes de acionar a API externa.
    if (!cepValido(cep)) {
      return res.status(400).json({
        sucesso: false,
        erro: {
          codigo: 'CEP_INVALIDO',
          mensagem: 'Informe um CEP válido com 8 dígitos.',
        },
      });
    }

    const endereco = await buscarEnderecoPorCep(cep);
    const cidadesAtendidas = String(process.env.CIDADES_ATENDIDAS || 'Corumbá,Ladário')
      .split(',')
      .map((cidade) => cidade.trim())
      .filter(Boolean);
    const entregaDisponivel = cidadeAtendida(endereco.localidade, cidadesAtendidas);

    return res.status(200).json({
      sucesso: true,
      dados: { ...endereco, entregaDisponivel },
      mensagem: 'Endereço encontrado na API ViaCEP.',
    });
  } catch (error) {
    if (error?.status && error?.codigo) {
      return res.status(error.status).json({
        sucesso: false,
        erro: {
          codigo: error.codigo,
          mensagem: error.message,
        },
      });
    }

    return next(error);
  }
}
