import { useState } from 'react';
import { ICONE_URLS } from '../lib/icones.js';
import IconeTransparente from './IconeTransparente.jsx';

export default function Login({
  autenticado,
  tipo,
  acessos,
  onLogin,
  onLoginCliente,
  onCadastroCliente,
  onLogout,
  onAcessarAdmin,
}) {
  const [modo, setModo] = useState('cliente');
  const [modoCliente, setModoCliente] = useState('entrar');
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [senhaCliente, setSenhaCliente] = useState('');
  const [token, setToken] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErro('');
    if (!token.trim()) {
      setErro('Coloque o token de acesso para acessar a página completa.');
      return;
    }
    setEnviando(true);
    try {
      await onLogin(token.trim());
      setToken('');
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComoCliente(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modoCliente === 'cadastro') {
        await onCadastroCliente({ nome: nomeCliente, email: emailCliente, senha: senhaCliente });
      } else {
        await onLoginCliente({ email: emailCliente, senha: senhaCliente });
      }
      setSenhaCliente('');
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  async function abrirAdmin() {
    setErro('');
    setModo('admin');
    setToken('');
  }

  if (autenticado) {
    const administrador = tipo === 'administrador';
    return (
      <section className="session">
        <div className="session-principal">
          <div className="session-perfil">
            <IconeTransparente
              className="session-perfil-icone"
              src={administrador ? ICONE_URLS.administrador : ICONE_URLS.cliente}
              alt={administrador ? 'Ícone de administrador' : 'Ícone de cliente'}
            />
            <span className="session-perfil-legenda">
              {administrador ? 'Administrador' : 'Cliente'}
            </span>
          </div>
          <div>
            <strong>
              <IconeTransparente className="icone-url icone-sucesso" src={ICONE_URLS.sucesso} alt="" />{' '}
              Sessão ativa
            </strong>
            <p>Acessos à rota protegida: {acessos}</p>
          </div>
        </div>
        <div className="session-acoes">
          <button type="button" className="secondary" onClick={onLogout}>Sair</button>
        </div>
      </section>
    );
  }

  if (modo === 'admin') {
    return (
      <section className="card login-admin-pagina">
        <button
          type="button"
          className="login-voltar"
          onClick={() => { setModo('cliente'); setErro(''); setToken(''); }}
        >
          ← Voltar para acesso do cliente
        </button>

        <div className="admin-login-cabecalho">
          <IconeTransparente className="admin-login-icone" src={ICONE_URLS.administrador} alt="" />
          <div>
            <span className="eyebrow admin-eyebrow">Área restrita</span>
            <h2>Acesso do administrador</h2>
          </div>
        </div>

        <p className="muted">
          Coloque o token de acesso para acessar a página completa.
        </p>

        <form className="login-form" onSubmit={submit}>
          <input
            type="password"
            placeholder="Token de acesso"
            aria-label="Token de acesso"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={enviando}
            autoComplete="current-password"
          />
          <button type="submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Acessar página do administrador'}
          </button>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </section>
    );
  }

  return (
    <section className="card login-escolha cliente-login-card">
      <div className="cliente-login-conteudo">
        <span className="login-opcao-icone login-opcao-icone-imagem">
          <IconeTransparente src={ICONE_URLS.loginCliente} alt="Ícone de cliente" />
        </span>
        <span className="login-opcao-titulo">{modoCliente === 'cadastro' ? 'Criar conta de cliente' : 'Acessar como cliente'}</span>
        <span className="login-opcao-desc">
          Entre na sua conta para procurar produtos, montar seu carrinho e usar os cupons disponíveis.
        </span>
        <form className="login-form" onSubmit={entrarComoCliente}>
          {modoCliente === 'cadastro' && (
            <input
              type="text"
              placeholder="Nome completo"
              aria-label="Nome completo"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
              disabled={enviando}
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            aria-label="E-mail"
            value={emailCliente}
            onChange={(e) => setEmailCliente(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            disabled={enviando}
          />
          <input
            type="password"
            placeholder={modoCliente === 'cadastro' ? 'Crie uma senha (mínimo 8 caracteres)' : 'Senha'}
            aria-label="Senha do cliente"
            value={senhaCliente}
            onChange={(e) => setSenhaCliente(e.target.value)}
            autoComplete={modoCliente === 'cadastro' ? 'new-password' : 'current-password'}
            minLength={modoCliente === 'cadastro' ? 8 : 1}
            maxLength={128}
            required
            disabled={enviando}
          />
          <button type="submit" className="login-cliente-principal" disabled={enviando}>
            {enviando ? 'Aguarde...' : modoCliente === 'cadastro' ? 'Criar conta e entrar' : 'Entrar como cliente'}
          </button>
        </form>
        <button
          type="button"
          className="link-admin"
          onClick={() => { setModoCliente(modoCliente === 'cadastro' ? 'entrar' : 'cadastro'); setErro(''); }}
          disabled={enviando}
        >
          {modoCliente === 'cadastro' ? 'Já tenho uma conta — entrar' : 'Ainda não tenho conta — cadastrar'}
        </button>
        <button type="button" className="link-admin" onClick={abrirAdmin} disabled={enviando}>
          Ou acessar como administrador
        </button>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  );
}
