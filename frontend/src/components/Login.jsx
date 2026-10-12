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
  onRecuperarSenha,
  onRedefinirSenha,
  onLogout,
  onAcessarAdmin,
}) {
  const [modo, setModo] = useState('cliente');
  const tokenInicial = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redefinirSenha') : null;
  const [modoCliente, setModoCliente] = useState(tokenInicial ? 'redefinir' : 'entrar');
  const [mensagemReset, setMensagemReset] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [senhaCliente, setSenhaCliente] = useState('');
  const [mostrarSenhaCliente, setMostrarSenhaCliente] = useState(false);
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
    setMensagemReset('');
    setEnviando(true);
    try {
      if (modoCliente === 'cadastro') {
        await onCadastroCliente({ nome: nomeCliente, email: emailCliente, senha: senhaCliente });
      } else if (modoCliente === 'recuperar') {
        await onRecuperarSenha(emailCliente);
        setMensagemReset('Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.');
      } else if (modoCliente === 'redefinir') {
        const token = new URLSearchParams(window.location.search).get('redefinirSenha');
        await onRedefinirSenha(token, senhaCliente);
        setMensagemReset('Senha redefinida com sucesso. Agora entre com a nova senha.');
        setModoCliente('entrar');
        window.history.replaceState({}, '', window.location.pathname);
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
        <span className="login-opcao-titulo">{modoCliente === 'cadastro' ? 'Criar conta de cliente' : modoCliente === 'recuperar' ? 'Recuperar senha' : modoCliente === 'redefinir' ? 'Criar nova senha' : 'Acessar como cliente'}</span>
        <span className="login-opcao-desc">
          {modoCliente === 'recuperar' ? 'Informe o e-mail cadastrado para receber um link de redefinição.' : modoCliente === 'redefinir' ? 'Escolha uma nova senha para sua conta.' : 'Entre na sua conta para procurar produtos, montar seu carrinho e usar os cupons disponíveis.'}
        </span>
        <form className={`login-form login-form-cliente modo-${modoCliente}`} onSubmit={entrarComoCliente}>
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
          {(modoCliente === 'entrar' || modoCliente === 'cadastro') ? (
            <div className="login-cliente-campos-linha">
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
              <div className="login-senha-campo">
                <input
                  type={mostrarSenhaCliente ? 'text' : 'password'}
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
                <button
                  type="button"
                  className="login-senha-alternar"
                  onClick={() => setMostrarSenhaCliente((visivel) => !visivel)}
                  aria-label={mostrarSenhaCliente ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenhaCliente}
                  title={mostrarSenhaCliente ? 'Ocultar senha' : 'Mostrar senha'}
                  disabled={enviando}
                >
                  {mostrarSenhaCliente ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 5.3 9.5 7-.3.8-1.4 2.6-3.4 4.2M6.2 6.2C3.9 7.7 2.7 10.1 2.5 12c.4 1 3.4 7 9.5 7 1.2 0 2.3-.2 3.3-.7" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-7 9.5-7 9.5 7 9.5 7-3.2 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {modoCliente !== 'redefinir' && <input
                type="email"
                placeholder="E-mail"
                aria-label="E-mail"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                autoComplete="email"
                maxLength={254}
                required
                disabled={enviando}
              />}
              {modoCliente !== 'recuperar' && <div className="login-senha-campo">
                <input
                  type={mostrarSenhaCliente ? 'text' : 'password'}
                  placeholder={modoCliente === 'redefinir' ? 'Nova senha (mínimo 8 caracteres)' : 'Senha'}
                  aria-label={modoCliente === 'redefinir' ? 'Nova senha' : 'Senha do cliente'}
                  value={senhaCliente}
                  onChange={(e) => setSenhaCliente(e.target.value)}
                  autoComplete={modoCliente === 'redefinir' ? 'new-password' : 'current-password'}
                  minLength={modoCliente === 'redefinir' ? 8 : 1}
                  maxLength={128}
                  required
                  disabled={enviando}
                />
                <button type="button" className="login-senha-alternar" onClick={() => setMostrarSenhaCliente((visivel) => !visivel)} aria-label={mostrarSenhaCliente ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenhaCliente} title={mostrarSenhaCliente ? 'Ocultar senha' : 'Mostrar senha'} disabled={enviando}>
                  {mostrarSenhaCliente ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 5.3 9.5 7-.3.8-1.4 2.6-3.4 4.2M6.2 6.2C3.9 7.7 2.7 10.1 2.5 12c.4 1 3.4 7 9.5 7 1.2 0 2.3-.2 3.3-.7" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-7 9.5-7 9.5 7 9.5 7-3.2 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
              </div>}
            </>
          )}
          {modoCliente === 'entrar' ? (
            <div className="login-cliente-botoes-linha">
              <button type="submit" className="login-cliente-principal" disabled={enviando}>{enviando ? 'Aguarde...' : 'Entrar como cliente'}</button>
              <button type="button" className="login-cliente-cadastrar" onClick={() => { setModoCliente('cadastro'); setErro(''); setMensagemReset(''); setMostrarSenhaCliente(false); }} disabled={enviando}>Cadastrar cliente</button>
            </div>
          ) : (
            <button type="submit" className="login-cliente-principal" disabled={enviando}>
              {enviando ? 'Aguarde...' : modoCliente === 'cadastro' ? 'Criar conta e entrar' : modoCliente === 'recuperar' ? 'Enviar link de redefinição' : 'Salvar nova senha'}
            </button>
          )}
        </form>
        {modoCliente === 'entrar' && <button type="button" className="link-admin" onClick={() => { setModoCliente('recuperar'); setErro(''); setMensagemReset(''); }} disabled={enviando}>Esqueci minha senha</button>}
        {modoCliente === 'cadastro' && <button type="button" className="link-admin" onClick={() => { setModoCliente('entrar'); setErro(''); setMensagemReset(''); }} disabled={enviando}>Já tenho uma conta — entrar</button>}
        {(modoCliente === 'recuperar' || modoCliente === 'redefinir') && <button type="button" className="link-admin" onClick={() => { setModoCliente('entrar'); setErro(''); setMensagemReset(''); window.history.replaceState({}, '', window.location.pathname); }} disabled={enviando}>Voltar para entrar</button>}
        <button type="button" className="link-admin" onClick={abrirAdmin} disabled={enviando}>
          Ou acessar como administrador
        </button>
      </div>
      {mensagemReset && <p className="sucesso" role="status">{mensagemReset}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  );
}
