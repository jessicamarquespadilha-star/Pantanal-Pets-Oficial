/** Modelo de Cupom: normalização de linhas vindas do banco. */
export function cupomDaLinha(row) {
  return {
    id: Number(row.id),
    codigo: row.codigo,
    descricao: row.descricao || '',
    tipo: row.tipo,
    valor: Number(row.valor),
    ativo: Number(row.ativo) === 1,
    criadoEm: row.criado_em,
    categoria: row.categoria || null,
    validadeInicio: row.validade_inicio || null,
    validadeFim: row.validade_fim || null,
  };
}
