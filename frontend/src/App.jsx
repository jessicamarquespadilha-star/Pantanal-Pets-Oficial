import { useCallback, useEffect, useRef, useState } from 'react';
import Login from './components/Login.jsx';
import PaginaCarregamento from './components/PaginaCarregamento.jsx';
import PaginaErro from './components/PaginaErro.jsx';
import ProdutoForm from './components/ProdutoForm.jsx';
import ProdutoList from './components/ProdutoList.jsx';
import Dashboard from './components/Dashboard.jsx';
import Historico from './components/Historico.jsx';
import Toasts from './components/Toasts.jsx';
import Cupons from './components/Cupons.jsx';
import LojaCliente from './components/LojaCliente.jsx';
import Icon from './components/Icon.jsx';
import { ICONE_URLS } from './lib/icones.js';
import IconeTransparente from './components/IconeTransparente.jsx';
import Navbar from './components/Navbar.jsx';
import BanhoTosa from './components/BanhoTosa.jsx';
import { useToasts } from './lib/useToasts.js';
import {
  criarProduto,
  atualizarProduto,
  excluirProduto,
  listarProdutos,
  login,
  loginCliente,
  cadastrarCliente,
  recuperarSenha,
  redefinirSenha,
  logout,
  perfil,
  estatisticas,
  categorias,
  historico,
  limparHistorico,
  exportarProdutos,
  listarCupons,
  criarCupom,
  atualizarCupom,
  excluirCupom,
  config,
  listarAgendamentos,
} from './services/api.js';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [filtro, setFiltro] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ordem, setOrdem] = useState('nome');
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [erroInicial, setErroInicial] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState(null); // 'administrador' | 'cliente'
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const [acessos, setAcessos] = useState(0);
  const [dados, setDados] = useState(null);
  const [cats, setCats] = useState([]);
  const [hist, setHist] = useState([]);
  const [cupons, setCupons] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [whatsappNumero, setWhatsappNumero] = useState('556792460374');
  const heroRef = useRef(null);
  const footerLogoRef = useRef(null);
  const [paginaAtual, setPaginaAtual] = useState('home');
  const [buscaGeral, setBuscaGeral] = useState('');
  const [resultadosBuscaProdutos, setResultadosBuscaProdutos] = useState([]);
  const [erroBuscaGeral, setErroBuscaGeral] = useState('');
  const [historicoOculto, setHistoricoOculto] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('loja-pet-historico-oculto') === '1';
  });

  const { itens: toasts, notificar, remover: removerToast } = useToasts();

  const [tema, setTema] = useState(() => {
    if (typeof window === 'undefined') return 'claro';
    return localStorage.getItem('loja-pet-tema') || 'claro';
  });
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem('loja-pet-tema', tema);
  }, [tema]);
  const alternarTema = () =>
    setTema((t) => (t === 'claro' ? 'escuro' : 'claro'));

  useEffect(() => {
    localStorage.setItem(
      'loja-pet-historico-oculto',
      historicoOculto ? '1' : '0'
    );
  }, [historicoOculto]);

  useEffect(() => {
    config()
      .then((r) => {
        setWhatsappNumero('556792460374');
      })
      .catch(() => {});
  }, []);

  // Sincroniza a altura da logo do rodapé com o cabeçalho e reserva uma área
  // mais larga para que a arte completa fique mais visível.
  useEffect(() => {
    const hero = heroRef.current;
    const logo = footerLogoRef.current;
    if (!hero || !logo) return undefined;

    const sincronizarDimensoes = () => {
      const medidas = hero.getBoundingClientRect();
      if (!medidas.width || !medidas.height) return;
      // A logo do rodapé ganha mais largura que a área do GIF do cabeçalho,
      // mantendo altura semelhante para que o conteúdo fique mais legível.
      const larguraLogo = Math.min(360, Math.max(280, medidas.width * 0.34));
      logo.style.width = `${larguraLogo}px`;
      logo.style.height = `${medidas.height}px`;
      logo.style.flexBasis = `${larguraLogo}px`;
    };

    sincronizarDimensoes();
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(sincronizarDimensoes)
        : null;
    observer?.observe(hero);
    window.addEventListener('resize', sincronizarDimensoes);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sincronizarDimensoes);
    };
  }, []);

  const jaAutenticouRef = useRef(false);
  useEffect(() => {
    if (autenticado) jaAutenticouRef.current = true;
  }, [autenticado]);

  const encerrarSessaoLocal = useCallback(() => {
    setAutenticado(false);
    setTipoUsuario(null);
    setProdutos([]);
    setDados(null);
    setHist([]);
    setCupons([]);
    setAcessos(0);
  }, []);

  useEffect(() => {
    function aoExpirar() {
      encerrarSessaoLocal();
      if (jaAutenticouRef.current) setSessaoExpirada(true);
    }
    window.addEventListener('sessao-expirada', aoExpirar);
    return () => window.removeEventListener('sessao-expirada', aoExpirar);
  }, [encerrarSessaoLocal]);

  const carregarProdutos = useCallback(
    async (paginaAlvo = pagina) => {
      const resposta = await listarProdutos({
        nome: filtro,
        categoria,
        ordem,
        precoMin,
        precoMax,
        pagina: paginaAlvo,
        porPagina: 10,
      });
      setProdutos(resposta?.dados?.itens ?? []);
      setTotal(resposta?.dados?.total ?? 0);
      setTotalPaginas(resposta?.dados?.totalPaginas ?? 1);
      setPagina(resposta?.dados?.pagina ?? paginaAlvo);
    },
    [filtro, categoria, ordem, precoMin, precoMax, pagina]
  );

  const carregarPainel = useCallback(async (tipoAtual) => {
    if (tipoAtual === 'administrador') {
      const [s, c, h, p, cu, a] = await Promise.all([
        estatisticas(),
        categorias(),
        historico(),
        perfil(),
        listarCupons(),
        listarAgendamentos(),
      ]);
      setDados(s?.dados ?? null);
      setCats(c?.dados ?? []);
      setHist(h?.dados ?? []);
      setAcessos(p?.dados?.acessos || 0);
      setCupons(cu?.dados ?? []);
      setAgendamentos(a?.dados ?? []);
    } else {
      const [c, p, cu] = await Promise.all([
        categorias(),
        perfil(),
        listarCupons(),
      ]);
      setCats(c?.dados ?? []);
      setAcessos(p?.dados?.acessos || 0);
      setCupons(cu?.dados ?? []);
    }
  }, []);

  // Canal WebSocket opcional: quando outro navegador altera produtos/cupons,
  // a tela atualiza automaticamente sem polling e sem mudar o layout existente.
  useEffect(() => {
    if (!autenticado || typeof window === 'undefined') return undefined;

    const apiBase = String(
      import.meta.env.VITE_API_URL ||
        (window.location.hostname.endsWith('.webcontainer.io')
          ? 'https://pantanal-pets.onrender.com'
          : '')
    ).replace(/\/$/, '');
    const wsBase = String(
      import.meta.env.VITE_WS_URL ||
        (window.location.hostname.endsWith('.webcontainer.io')
          ? 'wss://pantanal-pets.onrender.com'
          : '')
    ).replace(/\/$/, '');
    const origem =
      wsBase ||
      apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') ||
      window.location.origin
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:');
    const url = `${origem}/ws`;
    let socket;
    let encerrado = false;
    let timer;

    const conectar = () => {
      if (encerrado) return;
      try {
        socket = new WebSocket(url);
        socket.onmessage = async (event) => {
          try {
            const mensagem = JSON.parse(event.data);
            if (mensagem.evento !== 'atualizacao') return;
            if (
              mensagem.tipo === 'agendamento' ||
              mensagem.tipo === 'banho-opcoes'
            ) {
              window.dispatchEvent(new CustomEvent('banho-tosa-atualizado'));
            }
            await carregarProdutos();
            if (tipoUsuario === 'administrador') {
              await carregarPainel('administrador');
              if (mensagem.tipo === 'agendamento') {
                const r = await listarAgendamentos();
                setAgendamentos(r?.dados ?? []);
                if (mensagem.acao === 'criado')
                  notificar(
                    'Novo agendamento de Banho e Tosa recebido.',
                    'sucesso'
                  );
              }
            }
          } catch {
            // O canal em tempo real é complementar; a API continua sendo a fonte de verdade.
          }
        };
        socket.onclose = () => {
          if (!encerrado) timer = window.setTimeout(conectar, 4000);
        };
        socket.onerror = () => socket?.close();
      } catch {
        timer = window.setTimeout(conectar, 4000);
      }
    };

    conectar();
    return () => {
      encerrado = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [autenticado, tipoUsuario, carregarProdutos, carregarPainel, notificar]);

  const carregar = useCallback(
    async (paginaAlvo = pagina, { comPainel = true, tipoAtual } = {}) => {
      setCarregando(true);
      setErro('');
      try {
        await carregarProdutos(paginaAlvo);
        if (comPainel) await carregarPainel(tipoAtual);
        setAutenticado(true);
        setSessaoExpirada(false);
      } catch (e) {
        if (e.status !== 401) setErro(e.message);
      } finally {
        setCarregando(false);
      }
    },
    [carregarProdutos, carregarPainel, pagina]
  );

  useEffect(() => {
    let ativo = true;
    async function iniciarAplicacao() {
      try {
        const r = await perfil();
        if (!ativo) return;
        const tipoAtual = r?.dados?.tipo || 'cliente';
        setAutenticado(true);
        setTipoUsuario(tipoAtual);
        await carregar(1, { tipoAtual });
      } catch (e) {
        // 401 significa apenas que ainda não existe uma sessão: nesse caso
        // a tela de login é o estado normal da aplicação.
        if (e?.status !== 401) {
          console.warn('Não foi possível restaurar a sessão:', e);
          if (ativo)
            setErroInicial(
              e?.message || 'Não foi possível carregar a aplicação.'
            );
        }
      } finally {
        if (ativo) setInicializando(false);
      }
    }
    iniciarAplicacao();
    return () => {
      ativo = false;
    };
  }, []);

  async function entrar(token) {
    const resposta = await login(token);
    const tipoAtual = resposta?.dados?.tipo || 'administrador';
    setAutenticado(true);
    setTipoUsuario(tipoAtual);
    setPaginaAtual('home');
    setSessaoExpirada(false);
    notificar(resposta.mensagem || 'Login realizado com sucesso.', 'sucesso');
    await carregar(1, { tipoAtual });
  }

  async function entrarComoCliente(credenciais) {
    const resposta = await loginCliente(credenciais);
    const tipoAtual = resposta?.dados?.tipo || 'cliente';
    setAutenticado(true);
    setTipoUsuario(tipoAtual);
    setPaginaAtual('home');
    setSessaoExpirada(false);
    notificar(resposta.mensagem || 'Acesso como cliente realizado.', 'sucesso');
    await carregar(1, { tipoAtual });
  }

  async function cadastrarComoCliente(dados) {
    const resposta = await cadastrarCliente(dados);
    const tipoAtual = resposta?.dados?.tipo || 'cliente';
    setAutenticado(true);
    setTipoUsuario(tipoAtual);
    setPaginaAtual('home');
    setSessaoExpirada(false);
    notificar(resposta.mensagem || 'Conta criada com sucesso.', 'sucesso');
    await carregar(1, { tipoAtual });
  }

  async function sair() {
    try {
      await logout();
    } catch {
    } finally {
      encerrarSessaoLocal();
    }
    notificar('Sessão encerrada.', 'sucesso');
  }

  async function salvar(p) {
    setErro('');
    try {
      let resposta;
      if (editando) {
        resposta = await atualizarProduto(editando.id, p);
        setEditando(null);
      } else {
        resposta = await criarProduto(p);
      }
      notificar(resposta.mensagem, 'sucesso');
      await carregar(editando ? pagina : 1, { tipoAtual: tipoUsuario });
    } catch (e) {
      if (e.status !== 401) notificar(e.message, 'erro');
      throw e;
    }
  }

  async function excluir(id) {
    try {
      const resposta = await excluirProduto(id);
      notificar(resposta.mensagem, 'sucesso');
      const proximaPagina =
        produtos.length === 1 && pagina > 1 ? pagina - 1 : pagina;
      await carregar(proximaPagina, { tipoAtual: tipoUsuario });
    } catch (e) {
      if (e.status !== 401) notificar(e.message, 'erro');
      throw e;
    }
  }

  async function aoLimparHistorico() {
    try {
      const resposta = await limparHistorico();
      setHist([]);
      notificar(resposta.mensagem || 'Histórico limpo com sucesso.', 'sucesso');
    } catch (e) {
      if (e.status !== 401) notificar(e.message, 'erro');
    }
  }

  async function aoCriarCupom(dadosCupom) {
    const resposta = await criarCupom(dadosCupom);
    notificar(resposta.mensagem, 'sucesso');
    const atualizados = await listarCupons();
    setCupons(atualizados?.dados ?? []);
  }

  async function aoEditarCupom(id, dadosCupom) {
    try {
      const resposta = await atualizarCupom(id, dadosCupom);
      notificar(resposta.mensagem, 'sucesso');
      const atualizados = await listarCupons();
      setCupons(atualizados?.dados ?? []);
    } catch (e) {
      if (e.status !== 401) notificar(e.message, 'erro');
      throw e;
    }
  }

  async function aoExcluirCupom(id) {
    // A confirmação é feita pela janela personalizada do componente Cupons.
    // Não usar window.confirm aqui para evitar o alerta nativo do navegador.
    try {
      const resposta = await excluirCupom(id);
      notificar(resposta.mensagem, 'sucesso');
      const atualizados = await listarCupons();
      setCupons(atualizados?.dados ?? []);
    } catch (e) {
      if (e.status !== 401) notificar(e.message, 'erro');
    }
  }

  function irHome() {
    setPaginaAtual('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function irProdutos() {
    setPaginaAtual('produtos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function irCupons() {
    setPaginaAtual('cupons');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function irBanhoTosa() {
    setPaginaAtual('banho-tosa');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buscar(e) {
    e?.preventDefault?.();
    // Pesquisa do formulário de produtos: mantém o fluxo específico da loja.
    setPagina(1);
    if (tipoUsuario !== 'administrador') setPaginaAtual('produtos');
    carregar(1, { comPainel: false });
  }

  async function buscarGeral(e, termoRecebido) {
    e?.preventDefault?.();
    const termo = String(termoRecebido ?? filtro ?? '').trim();
    setErroBuscaGeral('');
    setBuscaGeral(termo);
    setCategoria('');
    setPrecoMin('');
    setPrecoMax('');
    setOrdem('nome');

    if (!termo) {
      setResultadosBuscaProdutos([]);
      setPaginaAtual('home');
      setPagina(1);
      setFiltro('');
      try {
        const resposta = await listarProdutos({
          pagina: 1,
          porPagina: 10,
          ordem: 'nome',
        });
        setProdutos(resposta?.dados?.itens ?? []);
        setTotal(resposta?.dados?.total ?? 0);
        setTotalPaginas(resposta?.dados?.totalPaginas ?? 1);
      } catch (erro) {
        setErroBuscaGeral(
          erro.message || 'Não foi possível carregar os resultados.'
        );
      }
      return;
    }

    setPaginaAtual('busca');
    setCarregando(true);
    try {
      // Divide a consulta em palavras úteis para encontrar, por exemplo,
      // produtos por nome ou categoria mesmo quando a busca contém várias palavras.
      const palavras = [
        ...new Set(
          termo
            .toLocaleLowerCase('pt-BR')
            .split(/\s+/)
            .filter(
              (palavra) =>
                palavra.length > 1 &&
                ![
                  'de',
                  'da',
                  'do',
                  'das',
                  'dos',
                  'e',
                  'em',
                  'para',
                  'com',
                  'por',
                ].includes(palavra)
            )
        ),
      ];
      const consultas = palavras.length ? palavras : [termo];
      const respostas = await Promise.all(
        consultas.map((palavra) =>
          listarProdutos({
            nome: palavra,
            pagina: 1,
            porPagina: 50,
            ordem: 'nome',
          })
        )
      );
      const unicos = new Map();
      respostas.forEach((resposta) =>
        (resposta?.dados?.itens ?? []).forEach((produto) =>
          unicos.set(produto.id, produto)
        )
      );
      setResultadosBuscaProdutos([...unicos.values()]);
    } catch (erro) {
      setResultadosBuscaProdutos([]);
      setErroBuscaGeral(
        erro.message || 'Não foi possível realizar a pesquisa geral.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function abrirProdutosDaBusca(nomeProduto = '') {
    const termoProduto = String(nomeProduto || '').trim();
    setFiltro(termoProduto);
    setCategoria('');
    setPrecoMin('');
    setPrecoMax('');
    setOrdem('nome');
    setPagina(1);
    setPaginaAtual('produtos');
    setCarregando(true);
    try {
      const resposta = await listarProdutos({
        nome: termoProduto,
        pagina: 1,
        porPagina: 10,
        ordem: 'nome',
      });
      setProdutos(resposta?.dados?.itens ?? []);
      setTotal(resposta?.dados?.total ?? 0);
      setTotalPaginas(resposta?.dados?.totalPaginas ?? 1);
    } catch (erro) {
      setErro(erro.message || 'Não foi possível carregar os produtos.');
    } finally {
      setCarregando(false);
    }
  }

  async function acessarAdmin() {
    try {
      await logout();
    } catch {}
    encerrarSessaoLocal();
  }

  function paginar(novaPagina) {
    carregar(novaPagina, { comPainel: false });
  }

  const ehAdmin = tipoUsuario === 'administrador';
  const normalizarBusca = (valor) =>
    String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const palavrasBusca = normalizarBusca(buscaGeral)
    .split(/\s+/)
    .filter(
      (palavra) =>
        palavra.length > 1 &&
        ![
          'de',
          'da',
          'do',
          'das',
          'dos',
          'e',
          'em',
          'para',
          'com',
          'por',
        ].includes(palavra)
    );
  const cuponsBusca = cupons.filter((cupom) => {
    const texto = normalizarBusca(
      `${cupom.codigo || ''} ${cupom.descricao || ''} ${cupom.categoria || ''}`
    );
    return palavrasBusca.some((palavra) => texto.includes(palavra));
  });
  const atalhosBusca = [
    {
      id: 'produtos',
      titulo: 'Produtos da loja',
      descricao: 'Catálogo, categorias, preços e disponibilidade.',
      palavras:
        'produtos produto catálogo categoria categorias estoque ração alimento brinquedo acessório acessorios higiene saúde farmacia pet',
      abrir: () => abrirProdutosDaBusca(),
    },
    {
      id: 'cupons',
      titulo: 'Cupons e promoções',
      descricao: 'Consulte os cupons e descontos disponíveis.',
      palavras:
        'cupom cupons desconto descontos promoção promoções codigo código',
      abrir: irCupons,
    },
    {
      id: 'banho-tosa',
      titulo: 'Banho e Tosa',
      descricao:
        'Serviços, preços, horários e opções de transporte para o pet.',
      palavras:
        'banho tosa tosar agendamento agendar horário horarios serviço serviços transporte veículo veiculo buscar buscar pet',
      abrir: irBanhoTosa,
    },
    {
      id: 'entrega',
      titulo: 'Entrega e consulta de CEP',
      descricao: 'Consulte o endereço e confira a disponibilidade de entrega.',
      palavras:
        'entrega frete cep endereço endereco cidade transportadora entrega',
      abrir: () => abrirProdutosDaBusca(),
    },
    {
      id: 'whatsapp',
      titulo: 'Atendimento pelo WhatsApp',
      descricao:
        'Fale com a equipe para tirar dúvidas sobre a loja e os pedidos.',
      palavras:
        'whatsapp atendimento vendedor contato pedido pedidos ajuda falar',
      abrir: irHome,
    },
  ].filter((item) =>
    palavrasBusca.some((palavra) =>
      normalizarBusca(
        `${item.titulo} ${item.descricao} ${item.palavras}`
      ).includes(palavra)
    )
  );

  if (inicializando) {
    return (
      <PaginaCarregamento mensagem="Carregando produtos, sessão e configurações..." />
    );
  }

  if (erroInicial) {
    return (
      <PaginaErro
        titulo="Não foi possível carregar a loja"
        mensagem={erroInicial}
        onTentarNovamente={() => window.location.reload()}
      />
    );
  }

  return (
    <main className="container">
      <Toasts itens={toasts} onFechar={removerToast} />
      {carregando && autenticado && (
        <div className="carregamento-overlay" role="status" aria-live="polite">
          <div className="carregamento-overlay-card">
            <span className="carregamento-mini-spinner" aria-hidden="true" />
            <span>Atualizando a loja...</span>
          </div>
        </div>
      )}

      <div id="topo-loja" />
      <header className="hero" ref={heroRef}>
        <div className="hero-conteudo">
          <div className="marca">
            <div>
              <span className="eyebrow">
                {ehAdmin ? 'Painel interno' : 'Loja online'}
              </span>
              <h1>Pantanal Pets</h1>
            </div>
          </div>
          <button
            type="button"
            className="tema-toggle"
            onClick={alternarTema}
            title={
              tema === 'claro' ? 'Ativar modo escuro' : 'Ativar modo claro'
            }
          >
            {tema === 'claro' ? (
              <Icon name="fa-moon" />
            ) : (
              <Icon name="fa-sun" />
            )}
          </button>
        </div>
        <p className="hero-tagline">
          {ehAdmin
            ? 'Cadastro, estoque, estatísticas e histórico — sincronizados em tempo real.'
            : 'Procure produtos, monte seu carrinho e fale com a gente pelo WhatsApp.'}
        </p>
        <Navbar
          filtro={filtro}
          setFiltro={setFiltro}
          onBuscar={buscarGeral}
          ehAdmin={ehAdmin}
          autenticado={autenticado}
          onHome={irHome}
          onProdutos={irProdutos}
          onCupons={irCupons}
          onBanhoTosa={irBanhoTosa}
          paginaAtual={paginaAtual}
        />
      </header>

      {!autenticado && !sessaoExpirada && (
        <section className="card info">
          <h2>Como começar</h2>
          <p>
            Escolha uma das opções abaixo para entrar como cliente ou acessar a
            área administrativa.
          </p>
        </section>
      )}

      <Login
        autenticado={autenticado}
        tipo={tipoUsuario}
        acessos={acessos}
        onLogin={entrar}
        onLoginCliente={entrarComoCliente}
        onCadastroCliente={cadastrarComoCliente}
        onRecuperarSenha={recuperarSenha}
        onRedefinirSenha={redefinirSenha}
        onLogout={sair}
        onAcessarAdmin={acessarAdmin}
      />

      {sessaoExpirada && (
        <section className="card aviso">
          <div className="aviso-cabecalho">
            <h2>
              <Icon name="fa-triangle-exclamation" /> Sua sessão expirou
            </h2>
            <button
              type="button"
              className="aviso-excluir"
              onClick={() => setSessaoExpirada(false)}
              aria-label="Excluir aviso"
              title="Excluir aviso"
            >
              <IconeTransparente src={ICONE_URLS.remover} alt="" />
            </button>
          </div>
          <p>Faça login novamente para continuar.</p>
        </section>
      )}

      {autenticado && paginaAtual === 'busca' && (
        <section className="card busca-geral-resultados" aria-live="polite">
          <div className="section-heading">
            <div>
              <h2>Resultados da pesquisa geral</h2>
              <p>
                Pesquisa por <strong>“{buscaGeral}”</strong> em produtos,
                cupons, serviços e áreas da loja.
              </p>
            </div>
            <button type="button" className="btn-secundario" onClick={irHome}>
              Voltar à loja
            </button>
          </div>
          {erroBuscaGeral && (
            <p className="status erro" role="alert">
              {erroBuscaGeral}
            </p>
          )}
          {carregando && <p className="status">Pesquisando em toda a loja…</p>}
          {!carregando && (
            <>
              {resultadosBuscaProdutos.length > 0 && (
                <section className="busca-geral-grupo">
                  <div className="busca-geral-titulo">
                    <h3>Produtos</h3>
                    <span>{resultadosBuscaProdutos.length} resultado(s)</span>
                  </div>
                  <div className="busca-geral-lista">
                    {resultadosBuscaProdutos.map((produto) => (
                      <article className="busca-geral-item" key={produto.id}>
                        <div>
                          <strong>{produto.nome}</strong>
                          <span>
                            {produto.categoria || 'Produto da loja'} ·{' '}
                            {Number(produto.preco || 0).toLocaleString(
                              'pt-BR',
                              { style: 'currency', currency: 'BRL' }
                            )}
                          </span>
                          {produto.descricao && <p>{produto.descricao}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirProdutosDaBusca(produto.nome)}
                        >
                          Ver na loja
                        </button>
                      </article>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => abrirProdutosDaBusca()}
                  >
                    Abrir catálogo completo
                  </button>
                </section>
              )}
              {cuponsBusca.length > 0 && (
                <section className="busca-geral-grupo">
                  <div className="busca-geral-titulo">
                    <h3>Cupons e promoções</h3>
                    <span>{cuponsBusca.length} resultado(s)</span>
                  </div>
                  <div className="busca-geral-lista">
                    {cuponsBusca.map((cupom) => (
                      <article className="busca-geral-item" key={cupom.id}>
                        <div>
                          <strong>{cupom.codigo}</strong>
                          <span>{cupom.descricao || 'Cupom de desconto'}</span>
                          {cupom.categoria && (
                            <p>Categoria: {cupom.categoria}</p>
                          )}
                        </div>
                        <button type="button" onClick={irCupons}>
                          Ver cupons
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {atalhosBusca.length > 0 && (
                <section className="busca-geral-grupo">
                  <div className="busca-geral-titulo">
                    <h3>Serviços e áreas da loja</h3>
                  </div>
                  <div className="busca-geral-lista">
                    {atalhosBusca.map((item) => (
                      <article className="busca-geral-item" key={item.id}>
                        <div>
                          <strong>{item.titulo}</strong>
                          <span>{item.descricao}</span>
                        </div>
                        <button type="button" onClick={item.abrir}>
                          Acessar
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {resultadosBuscaProdutos.length === 0 &&
                cuponsBusca.length === 0 &&
                atalhosBusca.length === 0 &&
                !erroBuscaGeral && (
                  <div className="busca-geral-vazia">
                    <strong>Nenhum resultado encontrado.</strong>
                    <p>
                      Tente pesquisar por nome de produto, categoria, cupom,
                      banho e tosa, entrega ou atendimento.
                    </p>
                  </div>
                )}
            </>
          )}
        </section>
      )}

      {autenticado && paginaAtual === 'banho-tosa' && (
        <BanhoTosa ehAdmin={ehAdmin} />
      )}

      {autenticado && paginaAtual === 'produtos' && ehAdmin && (
        <>
          <Dashboard dados={dados} />
          <div className="admin-produtos-layout">
            <ProdutoForm
              key={editando ? `editar-${editando.id}` : 'novo'}
              onSalvar={salvar}
              editando={editando}
              onCancelar={() => setEditando(null)}
              categorias={cats}
            />
            <ProdutoList
              produtos={produtos}
              total={total}
              pagina={pagina}
              totalPaginas={totalPaginas}
              carregando={carregando}
              erro={erro}
              filtro={filtro}
              setFiltro={setFiltro}
              categoria={categoria}
              setCategoria={setCategoria}
              ordem={ordem}
              setOrdem={setOrdem}
              precoMin={precoMin}
              setPrecoMin={setPrecoMin}
              precoMax={precoMax}
              setPrecoMax={setPrecoMax}
              categorias={cats}
              onBuscar={buscar}
              onExcluir={excluir}
              onEditar={setEditando}
              onExportar={exportarProdutos}
              onPaginar={paginar}
            />
          </div>
        </>
      )}

      {autenticado && paginaAtual === 'produtos' && !ehAdmin && (
        <LojaCliente
          produtos={produtos}
          total={total}
          pagina={pagina}
          totalPaginas={totalPaginas}
          carregando={carregando}
          erro={erro}
          filtro={filtro}
          setFiltro={setFiltro}
          categoria={categoria}
          setCategoria={setCategoria}
          ordem={ordem}
          setOrdem={setOrdem}
          categorias={cats}
          onBuscar={buscar}
          onPaginar={paginar}
          whatsappNumero={whatsappNumero}
        />
      )}

      {autenticado && paginaAtual === 'cupons' && (
        <Cupons
          cupons={cupons}
          categorias={cats}
          modoAdmin={ehAdmin}
          onCriar={ehAdmin ? aoCriarCupom : undefined}
          onEditar={ehAdmin ? aoEditarCupom : undefined}
          onExcluir={ehAdmin ? aoExcluirCupom : undefined}
        />
      )}

      {autenticado && paginaAtual === 'home' && ehAdmin && (
        <>
          <Dashboard dados={dados} />
          <div className="admin-produtos-layout">
            <ProdutoForm
              key={editando ? `editar-${editando.id}` : 'novo'}
              onSalvar={salvar}
              editando={editando}
              onCancelar={() => setEditando(null)}
              categorias={cats}
            />
            <div id="admin-produtos">
              <ProdutoList
                produtos={produtos}
                total={total}
                pagina={pagina}
                totalPaginas={totalPaginas}
                carregando={carregando}
                erro={erro}
                filtro={filtro}
                setFiltro={setFiltro}
                categoria={categoria}
                setCategoria={setCategoria}
                ordem={ordem}
                setOrdem={setOrdem}
                precoMin={precoMin}
                setPrecoMin={setPrecoMin}
                precoMax={precoMax}
                setPrecoMax={setPrecoMax}
                categorias={cats}
                onBuscar={buscar}
                onExcluir={excluir}
                onEditar={setEditando}
                onExportar={exportarProdutos}
                onPaginar={paginar}
              />
            </div>
          </div>
          <div id="cupons">
            <Cupons
              cupons={cupons}
              categorias={cats}
              modoAdmin
              onCriar={aoCriarCupom}
              onEditar={aoEditarCupom}
              onExcluir={aoExcluirCupom}
            />
          </div>
          <BanhoTosa ehAdmin={ehAdmin} />
          <Historico
            itens={hist}
            oculto={historicoOculto}
            onOcultar={() => setHistoricoOculto((v) => !v)}
            onLimpar={aoLimparHistorico}
          />
        </>
      )}

      {autenticado && paginaAtual === 'home' && !ehAdmin && (
        <>
          <div
            id="produtos"
            className="home-cliente-funcao home-cliente-produtos"
          >
            <LojaCliente
              produtos={produtos}
              total={total}
              pagina={pagina}
              totalPaginas={totalPaginas}
              carregando={carregando}
              erro={erro}
              filtro={filtro}
              setFiltro={setFiltro}
              categoria={categoria}
              setCategoria={setCategoria}
              ordem={ordem}
              setOrdem={setOrdem}
              categorias={cats}
              onBuscar={buscar}
              onPaginar={paginar}
              whatsappNumero={whatsappNumero}
            />
          </div>
          <div id="cupons" className="home-cliente-funcao home-cliente-cupons">
            <Cupons cupons={cupons} />
          </div>
          <div className="home-cliente-funcao home-cliente-banho-tosa">
            <BanhoTosa ehAdmin={ehAdmin} />
          </div>
        </>
      )}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div
              className="footer-logo-wrap"
              ref={footerLogoRef}
              aria-hidden="true"
            >
              <img src="/Logo-Official.ico.png" alt="" />
            </div>
            <div>
              <strong>Pantanal Pets</strong>
              <span>
                Praticidade, carinho e tecnologia para cuidar do seu pet.
              </span>
            </div>
          </div>
          <div className="footer-status">
            <span className="footer-status-dot" aria-hidden="true" />
            <span>Sistema conectado</span>
          </div>
          <div className="footer-tech" aria-label="Tecnologias utilizadas">
            <span>
              <Icon name="fa-code" /> React
            </span>
            <span>
              <Icon name="fa-server" /> Express
            </span>
            <span>
              <Icon name="fa-database" /> SQLite
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Pantanal Pets</span>
          <span>•</span>
          <span>Gestão e experiência em um só lugar</span>
        </div>
      </footer>
    </main>
  );
}