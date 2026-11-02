import { useState } from 'react'
import { ICONE_URLS } from '../lib/icones.js'
import IconeTransparente from './IconeTransparente.jsx'

const ROTULOS = {
  criado: { texto: 'Criado', classe: 'badge-criado', icone: ICONE_URLS.criado },
  atualizado: { texto: 'Atualizado', classe: 'badge-atualizado', icone: ICONE_URLS.editar },
  excluido: { texto: 'Excluído', classe: 'badge-excluido', icone: ICONE_URLS.excluir },
}

export default function Historico({ itens, oculto, onOcultar, onLimpar }) {
  const [limpando, setLimpando] = useState(false)

  if (!itens) return null

  async function limpar() {
    if (!itens.length) return
    if (!window.confirm('Limpar todo o histórico? Essa ação não pode ser desfeita.')) return
    setLimpando(true)
    try {
      await onLimpar()
    } finally {
      setLimpando(false)
    }
  }

  return (
    <section className="card">
      <div className="section-heading historico-cabecalho">
        <div>
          <h2>Histórico</h2>
          <span className="route-tag">GET /api/historico</span>
        </div>
        <div className="historico-acoes">
          <button type="button" className="secondary" onClick={onOcultar}>
            <><IconeTransparente className="icone-url icone-acao-pequeno" src={oculto ? ICONE_URLS.visivel : ICONE_URLS.invisivel} alt="" /> {oculto ? 'Mostrar histórico' : 'Ocultar histórico'}</>
          </button>
          <button type="button" className="danger" onClick={limpar} disabled={limpando || itens.length === 0}>
            {limpando ? 'Limpando...' : <><IconeTransparente className="icone-url icone-acao-pequeno" src={ICONE_URLS.limpar_historico} alt="" /> Limpar histórico</>}
          </button>
        </div>
      </div>

      {!oculto && (
        itens.length === 0 ? (
          <p className="status">Nenhuma ação registrada ainda.</p>
        ) : (
          <ul className="historico-lista">
            {itens.map((item) => {
              const rotulo = ROTULOS[item.tipo] || { texto: item.tipo, classe: '', icone: ICONE_URLS.informacao }
              return (
                <li key={item.id}>
                  <span className={`badge ${rotulo.classe}`}>
                    <IconeTransparente className="icone-url icone-badge" src={rotulo.icone} alt="" /> {rotulo.texto}
                  </span>
                  <span className="historico-nome">{item.produtoNome}</span>
                  {item.detalhes && <span className="muted historico-detalhes">{item.detalhes}</span>}
                  <span className="muted historico-data num">{new Date(item.criadoEm).toLocaleString('pt-BR')}</span>
                </li>
              )
            })}
          </ul>
        )
      )}
    </section>
  )
}
