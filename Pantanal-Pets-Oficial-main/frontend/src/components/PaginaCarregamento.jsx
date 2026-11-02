import Icon from './Icon.jsx'

export default function PaginaCarregamento({ mensagem = 'Preparando a Pantanal Pets...' }) {
  return (
    <main className="estado-aplicacao estado-carregamento" role="status" aria-live="polite">
      <div className="estado-card">
        <div className="estado-logo" aria-hidden="true"><Icon name="fa-paw" /></div>
        <div className="estado-spinner" aria-hidden="true" />
        <span className="estado-eyebrow">PANTANAL PETS</span>
        <h1>Um momento...</h1>
        <p>{mensagem}</p>
        <div className="estado-detalhes">
          <span /><span /><span />
        </div>
      </div>
    </main>
  )
}
