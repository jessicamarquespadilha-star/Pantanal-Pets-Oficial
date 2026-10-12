import { ICONE_URLS } from '../lib/icones.js'
import IconeTransparente from './IconeTransparente.jsx'

const ICONE = { sucesso: ICONE_URLS.sucesso, erro: ICONE_URLS.aviso, info: ICONE_URLS.informacao }

export default function Toasts({ itens, onFechar }) {
  if (!itens.length) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {itens.map((t) => (
        <div key={t.id} className={`toast toast-${t.tipo}`}>
          <span className="toast-icone"><IconeTransparente className="icone-url icone-toast" src={ICONE[t.tipo] || ICONE_URLS.informacao} alt="" /></span>
          <span className="toast-texto">{t.texto}</span>
          <button type="button" className="toast-fechar" onClick={() => onFechar(t.id)} aria-label="Excluir aviso" title="Excluir aviso">
            <IconeTransparente className="icone-url icone-acao-pequeno" src={ICONE_URLS.remover} alt="" />
          </button>
        </div>
      ))}
    </div>
  )
}
