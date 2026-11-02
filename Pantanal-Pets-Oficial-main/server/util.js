export function validarProduto(body) {
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  const categoria =
    typeof body?.categoria === 'string' ? body.categoria.trim() : '';
  const preco = Number(body?.preco);

  if (!nome) return 'O nome é obrigatório.';
  if (nome.length > 120) return 'O nome deve ter no máximo 120 caracteres.';
  if (!categoria) return 'A categoria é obrigatória.';
  if (categoria.length > 80)
    return 'A categoria deve ter no máximo 80 caracteres.';
  if (!Number.isFinite(preco) || preco < 0)
    return 'O preço deve ser um número maior ou igual a zero.';
  if (preco > 999999999) return 'O preço informado é muito alto.';
  const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : '';
  if (descricao.length > 500) return 'A descrição deve ter no máximo 500 caracteres.';
  if (body?.unidadeVenda && !['kg', 'kit'].includes(body.unidadeVenda))
    return 'A unidade de venda deve ser kg, kit ou ficar sem seleção.';
  if (body?.validade) {
    const validade = new Date(body.validade);
    if (Number.isNaN(validade.getTime())) return 'A data de validade informada é inválida.';
  }
  return null;
}

export function capitalizar(texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

export function paginaValida(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 1;
}

export function porPaginaValido(valor, maximo = 50, padrao = 10) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return padrao;
  return Math.min(maximo, Math.floor(numero));
}

export function validarCupom(body) {
  const codigo = typeof body?.codigo === 'string' ? body.codigo.trim() : '';
  const tipo = body?.tipo === 'fixo' ? 'fixo' : 'percentual';
  const valor = Number(body?.valor);

  if (!codigo) return 'O código do cupom é obrigatório.';
  if (codigo.length > 40) return 'O código deve ter no máximo 40 caracteres.';
  if (!/^[A-Za-z0-9-]+$/.test(codigo))
    return 'O código só pode ter letras, números e hífen.';
  if (!Number.isFinite(valor) || valor <= 0)
    return 'Informe um valor de desconto maior que zero.';
  if (tipo === 'percentual' && valor > 100)
    return 'O desconto percentual não pode passar de 100%.';
  if (tipo === 'fixo' && valor > 999999)
    return 'O valor do desconto fixo é muito alto.';
  if (body?.validadeTipo !== '24h' && body?.validadeTipo !== 'personalizada')
    return 'Informe uma duração válida para o cupom.';
  if (body?.validadeTipo === 'personalizada') {
    const fim = new Date(body?.validadeFim);
    if (Number.isNaN(fim.getTime())) return 'Informe um horário de término válido.';
    if (fim.getTime() <= Date.now()) return 'O horário de término deve ser futuro.';
  }
  if (body?.categoria !== undefined && body?.categoria !== null && String(body.categoria).trim().length > 80)
    return 'A categoria do cupom é inválida.';
  return null;
}
