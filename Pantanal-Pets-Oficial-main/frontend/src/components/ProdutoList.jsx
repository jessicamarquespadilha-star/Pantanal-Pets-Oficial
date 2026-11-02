import { useState } from 'react';
import { corDe } from '../lib/categorias.js';
import { ICONE_URLS } from '../lib/icones.js';
import IconeTransparente from './IconeTransparente.jsx';
import IconeCategoria from './IconeCategoria.jsx';

function LinhasEsqueleto({ quantidade = 5 }) {
  return (
    <>
      {Array.from({ length: quantidade }).map((_, i) => (
        <tr
          key={i}
          className="linha-esqueleto"
          style={{ '--atraso': `${i * 60}ms` }}
        >
          <td colSpan={5}>
            <span className="esqueleto-bloco" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function ProdutoList({
  produtos,
  total,
  pagina,
  totalPaginas,
  carregando,
  erro,
  filtro,
  setFiltro,
  categoria,
  setCategoria,
  ordem,
  setOrdem,
  precoMin,
  setPrecoMin,
  precoMax,
  setPrecoMax,
  categorias,
  onBuscar,
  onExcluir,
  onEditar,
  onExportar,
  onPaginar,
}) {
  const [produtoPendenteExclusao, setProdutoPendenteExclusao] = useState(null);
  const [excluindoProduto, setExcluindoProduto] = useState(false);

  async function confirmarExclusaoProduto() {
    if (!produtoPendenteExclusao || excluindoProduto) return;
    setExcluindoProduto(true);
    try {
      await onExcluir(produtoPendenteExclusao.id);
      setProdutoPendenteExclusao(null);
    } catch {
      // erro já é tratado/exibido pelo componente pai
    } finally {
      setExcluindoProduto(false);
    }
  }

  return (
    <section className="card admin-produtos-card">
      <div className="section-heading">
        <div>
          <h2>Produtos</h2>
          <span className="route-tag">GET /api/produtos</span>
        </div>
        <div className="filters">
          <form className="search" onSubmit={onBuscar}>
            <div className="campo-pesquisa">
              <IconeTransparente
                className="icone-url icone-pesquisa"
                src={ICONE_URLS.lupa}
                alt=""
              />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Pesquisar por nome"
              />
            </div>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Todas categorias</option>

              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className="preco-filtro"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço mín."
              value={precoMin}
              onChange={(e) => setPrecoMin(e.target.value)}
            />

            <input
              className="preco-filtro"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço máx."
              value={precoMax}
              onChange={(e) => setPrecoMax(e.target.value)}
            />

            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="nome">Nome</option>
              <option value="preco-asc">Menor preço</option>
              <option value="preco-desc">Maior preço</option>
              <option value="id-desc">Mais recentes</option>
            </select>

            <button type="submit" className="busca-acao">
              Buscar
            </button>
            <button
              className="secondary busca-acao"
              type="button"
              onClick={onExportar}
            >
              Exportar CSV
            </button>
          </form>
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      {!carregando && produtos.length === 0 ? (
        <div className="status status-vazio" role="status">
          <img
            className="status-vazio-imagem"
            src="https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/main/vazio.png"
            alt="Nenhum produto encontrado"
            loading="lazy"
            decoding="async"
          />
          <p>Nenhum produto encontrado.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Descrição / validade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <LinhasEsqueleto />
                ) : (
                  produtos.map((p, i) => (
                    <tr
                      key={p.id}
                      className="linha-produto"
                      style={{ '--atraso': `${i * 30}ms` }}
                    >
                      <td className="col-id">{p.id}</td>
                      <td>
                        <div className="produto-nome-cell">
                          {p.imagem ? (
                            <img
                              className="produto-thumb"
                              src={p.imagem}
                              alt={p.nome}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span
                              className="produto-thumb produto-thumb-vazio"
                              aria-hidden="true"
                            >
                              <IconeCategoria categoria={p.categoria} />
                            </span>
                          )}
                          <span>{p.nome}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="categoria-tag"
                          style={{ '--cor': corDe(p.categoria) }}
                        >
                          <IconeCategoria
                            className="categoria-tag-icon"
                            categoria={p.categoria}
                          />{' '}
                          {p.categoria}
                        </span>
                      </td>
                      <td className="col-preco">
                        {Number(p.preco).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="produto-detalhes-admin">
                        <span>
                          {p.descricao || 'Sem descrição cadastrada.'}
                        </span>
                        {p.validade && (
                          <small>
                            Validade:{' '}
                            {new Date(p.validade).toLocaleDateString('pt-BR')}
                          </small>
                        )}
                        {p.unidadeVenda && (
                          <small>
                            Venda por: {p.unidadeVenda === 'kg' ? 'kg' : 'kit'}
                          </small>
                        )}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          onClick={() => onEditar(p)}
                          className="acao-produto-editar"
                          title="Editar produto"
                          aria-label={`Editar ${p.nome}`}
                        >
                          <IconeTransparente
                            className="icone-url icone-acao"
                            src={ICONE_URLS.editar}
                            alt=""
                          />
                        </button>
                        <button
                          className="btn-excluir-icone"
                          type="button"
                          onClick={() => setProdutoPendenteExclusao(p)}
                          title="Excluir produto"
                          aria-label={`Excluir ${p.nome}`}
                        >
                          <IconeTransparente
                            className="icone-url icone-acao-pequeno"
                            src={ICONE_URLS.excluir}
                            alt=""
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!carregando && totalPaginas > 1 && (
            <div className="paginacao">
              <button
                type="button"
                className="secondary"
                disabled={pagina <= 1}
                onClick={() => onPaginar(pagina - 1)}
              >
                <IconeTransparente
                  className="icone-url icone-paginacao"
                  src={ICONE_URLS.anterior}
                  alt=""
                />{' '}
                Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas} • {total} produto(s)
              </span>
              <button
                type="button"
                className="secondary"
                disabled={pagina >= totalPaginas}
                onClick={() => onPaginar(pagina + 1)}
              >
                <span>Próxima</span>{' '}
                <IconeTransparente
                  className="icone-url icone-paginacao"
                  src={ICONE_URLS.proxima}
                  alt=""
                />
              </button>
            </div>
          )}
        </>
      )}
      {produtoPendenteExclusao && (
        <div className="modal-aviso-exclusao" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !excluindoProduto) setProdutoPendenteExclusao(null); }}>
          <section className="modal-aviso-exclusao-conteudo" role="alertdialog" aria-modal="true" aria-labelledby="titulo-excluir-produto" aria-describedby="texto-excluir-produto">
            <h3 id="titulo-excluir-produto">Excluir produto?</h3>
            <p id="texto-excluir-produto">Tem certeza de que deseja excluir <strong>{produtoPendenteExclusao.nome}</strong>? Essa ação não pode ser desfeita.</p>
            <div className="modal-aviso-exclusao-acoes">
              <button type="button" className="secondary" onClick={() => setProdutoPendenteExclusao(null)} disabled={excluindoProduto}>Cancelar</button>
              <button type="button" className="btn-confirmar-exclusao" onClick={confirmarExclusaoProduto} disabled={excluindoProduto}>{excluindoProduto ? 'Excluindo...' : 'Sim, excluir'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
