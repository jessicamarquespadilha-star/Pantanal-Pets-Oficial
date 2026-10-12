import Icon from './Icon.jsx'

export default function PaginaErro({ titulo = 'Ops! Algo deu errado', mensagem = 'Não foi possível carregar esta página. Tente novamente.', onTentarNovamente }) {
  return (
    <main className="estado-aplicacao estado-erro-pagina" role="alert">
      <div className="estado-card">
        <div className="estado-logo estado-logo-erro" aria-hidden="true"><Icon name="fa-paw" /></div>
        <div className="estado-icone-erro" aria-hidden="true"><Icon name="fa-triangle-exclamation" /></div>
        <span className="estado-eyebrow">PANTANAL PETS</span>
        <h1>{titulo}</h1>
        <p>{mensagem}</p>
        <div className="estado-acoes">
          <button type="button" onClick={onTentarNovamente || (() => window.location.reload())}>
            <Icon name="fa-rotate-right" /> Tentar novamente
          </button>
          <button type="button" className="secondary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
        <small>Se o problema continuar, verifique sua conexão e tente novamente.</small>
      </div>
    </main>
  )
}
