import { corDe } from '../lib/categorias.js'
import { useContagem } from '../lib/useContagem.js'
import IconeCategoria from './IconeCategoria.jsx'

const moeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Estatistica({ rotulo, valor, formatar = (v) => Math.round(v) }) {
  const animado = useContagem(valor)
  return (
    <div>
      <span>{rotulo}</span>
      <strong className="num">{formatar(animado)}</strong>
    </div>
  )
}

function GraficoCategorias({ porCategoria, total }) {
  const entradas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
  if (entradas.length === 0) return null
  const maximo = Math.max(...entradas.map(([, q]) => q))

  return (
    <div className="grafico-categorias">
      <h3>Produtos por categoria</h3>
      <div className="grafico-barras">
        {entradas.map(([nome, quantidade]) => {
          const percentual = total > 0 ? Math.round((quantidade / total) * 100) : 0
          const largura = maximo > 0 ? (quantidade / maximo) * 100 : 0
          return (
            <div className="barra-linha" key={nome}>
              <span className="barra-rotulo">
                <IconeCategoria className="categoria-inline-icon" categoria={nome} /> {nome}
              </span>
              <div className="barra-trilha">
                <div className="barra-preenchida" style={{ '--largura': `${largura}%`, '--cor': corDe(nome) }} />
              </div>
              <span className="barra-valor num">
                {quantidade} <small>({percentual}%)</small>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ dados }) {
  if (!dados) return null

  return (
    <section className="card card-animada">
      <h2>Painel</h2>
      <span className="route-tag">GET /api/estatisticas</span>

      <div className="stats">
        <Estatistica rotulo="Produtos" valor={dados.total} />
        <Estatistica rotulo="Categorias" valor={dados.totalCategorias} />
        <Estatistica rotulo="Valor total" valor={dados.valorTotal} formatar={moeda} />
        <Estatistica rotulo="Preço médio" valor={dados.precoMedio} formatar={moeda} />
      </div>

      <div className="stats stats-secundarias">
        <div>
          <span>Produto mais caro</span>
          <strong>
            {dados.maisCaro ? dados.maisCaro.nome : '—'}
          </strong>
          {dados.maisCaro && <small>{moeda(dados.maisCaro.preco)}</small>}
        </div>
        <div>
          <span>Produto mais barato</span>
          <strong>
            {dados.maisBarato ? dados.maisBarato.nome : '—'}
          </strong>
          {dados.maisBarato && <small>{moeda(dados.maisBarato.preco)}</small>}
        </div>
        <div>
          <span>Categoria destaque</span>
          <strong>
            {dados.categoriaTop ? dados.categoriaTop : '—'}
          </strong>
          {dados.categoriaTop && <small>{dados.porCategoria[dados.categoriaTop]} produto(s)</small>}
        </div>
      </div>

      <GraficoCategorias porCategoria={dados.porCategoria} total={dados.total} />

      {dados.recentes?.length > 0 && (
        <div className="recentes">
          <h3>Adicionados recentemente</h3>
          <ul>
            {dados.recentes.map((p, i) => (
              <li key={p.id} style={{ '--atraso': `${i * 60}ms` }}>
                <strong>
                  <IconeCategoria className="categoria-inline-icon" categoria={p.categoria} /> {p.nome}
                </strong>
                <span className="recente-categoria muted">{p.categoria}</span>
                <span className="recente-preco num">{moeda(p.preco)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
