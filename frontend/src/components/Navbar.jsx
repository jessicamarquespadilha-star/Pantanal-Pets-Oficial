import { useState } from 'react';

export default function Navbar({ filtro, setFiltro, onBuscar, ehAdmin, autenticado, onHome, onBanhoTosa, onProdutos, onCupons, paginaAtual = 'home' }) {
  const [aberto, setAberto] = useState(false);
  const [buscaGeralLocal, setBuscaGeralLocal] = useState('');

  function enviarBusca(e) {
    e.preventDefault();
    onBuscar(e, buscaGeralLocal);
    setAberto(false);
  }

  function irPara(id) {
    setAberto(false);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  }

  return (
    <nav className="navbar-pet" aria-label="Navegação principal">
      <div className="navbar-pet-inner">
        <button
          type="button"
          className="navbar-toggler-pet"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-pet"
          aria-label="Abrir menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div id="menu-pet" className={`navbar-offcanvas-pet ${aberto ? 'aberto' : ''}`}>
          <div className="navbar-offcanvas-header">
            <strong>Menu Pantanal Pets</strong>
            <button type="button" className="navbar-close-pet" onClick={() => setAberto(false)} aria-label="Fechar menu">×</button>
          </div>

          <div className="navbar-links-pet">
            <button type="button" className={paginaAtual === 'home' ? 'active' : ''} aria-current={paginaAtual === 'home' ? 'page' : undefined} onClick={() => { setAberto(false); onHome?.(); }}>Home</button>
            {autenticado && <button type="button" className={paginaAtual === 'banho-tosa' ? 'active' : ''} aria-current={paginaAtual === 'banho-tosa' ? 'page' : undefined} onClick={() => { setAberto(false); onBanhoTosa?.(); }}>Banho e Tosa</button>}
            {autenticado && (
              <>
                <button type="button" className={paginaAtual === 'produtos' ? 'active' : ''} aria-current={paginaAtual === 'produtos' ? 'page' : undefined} onClick={() => { setAberto(false); onProdutos?.(); }}>Produtos</button>
                <button type="button" className={paginaAtual === 'cupons' ? 'active' : ''} aria-current={paginaAtual === 'cupons' ? 'page' : undefined} onClick={() => { setAberto(false); onCupons?.(); }}>Cupons</button>
              </>
            )}
          </div>

          {autenticado && (
          <form className="navbar-search-pet" role="search" onSubmit={enviarBusca}>
            <input
              type="search"
              value={buscaGeralLocal}
              onChange={(e) => setBuscaGeralLocal(e.target.value)}
              placeholder="Buscar em toda a loja..."
              aria-label="Busca geral"
            />
            <button type="submit">Buscar</button>
          </form>
          )}
        </div>

        {aberto && <button className="navbar-backdrop-pet" onClick={() => setAberto(false)} aria-label="Fechar menu" />}
      </div>
    </nav>
  );
}
