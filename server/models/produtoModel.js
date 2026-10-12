/** Modelo de Produto: normalização de linhas vindas do banco. */
export function produtoDaLinha(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    categoria: row.categoria,
    preco: Number(row.preco),
    descricao: row.descricao || '',
    validade: row.validade || null,
    unidadeVenda: row.unidade_venda || null,
    imagem: row.imagem || null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export const SELECT_PRODUTO = `
  SELECT p.id, p.nome, COALESCE(c.nome, 'Sem categoria') AS categoria, p.preco, p.descricao, p.validade, p.unidade_venda, p.imagem, p.criado_em, p.atualizado_em
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
`;
