import { useEffect, useMemo, useState } from 'react'
import { corDe } from '../lib/categorias.js'
import { ICONE_URLS } from '../lib/icones.js'
import IconeCategoria from './IconeCategoria.jsx'
import IconeTransparente from './IconeTransparente.jsx'
import WhatsappButton from './WhatsappButton.jsx'
import { buscarCep as buscarCepApi, validarCupom as validarCupomApi } from '../services/api.js'

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarCep(valor) {
  const numeros = String(valor ?? '').replace(/\D/g, '').slice(0, 8)
  if (numeros.length <= 5) return numeros
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

export default function LojaCliente({
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
  categorias,
  onBuscar,
  onPaginar,
  whatsappNumero = '',
}) {
  const [carrinho, setCarrinho] = useState([])
  const [codigoCupom, setCodigoCupom] = useState('')
  const [cuponsAplicados, setCuponsAplicados] = useState([])
  const [erroCupom, setErroCupom] = useState('')
  const [validandoCupom, setValidandoCupom] = useState(false)
  const [cep, setCep] = useState('')
  const [pais, setPais] = useState('Brasil')
  const [alertaEntrega, setAlertaEntrega] = useState('')
  const [endereco, setEndereco] = useState(null)
  const [erroCep, setErroCep] = useState('')
  const [consultandoCep, setConsultandoCep] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())
  const [quantidadesEscolhidas, setQuantidadesEscolhidas] = useState({})

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!cuponsAplicados.length) return
    const validos = cuponsAplicados.filter((cupom) => {
      const expirado = cupom.validadeFim && new Date(cupom.validadeFim).getTime() <= agora
      const possuiCategoriaElegivel = !cupom.categoria || carrinho.some(
        (item) => item.categoria.toLocaleLowerCase() === cupom.categoria.toLocaleLowerCase()
      )
      return !expirado && possuiCategoriaElegivel
    })
    if (validos.length !== cuponsAplicados.length) {
      setCuponsAplicados(validos)
      setErroCupom('Um cupom expirado ou incompatível com os itens foi removido do carrinho.')
    }
  }, [agora, carrinho, cuponsAplicados])

  function quantidadeEscolhida(produto) { return Number(quantidadesEscolhidas[produto.id] ?? 1) }
  function adicionarAoCarrinho(produto) {
    const quantidade = produto.unidadeVenda ? quantidadeEscolhida(produto) : 1
    setCarrinho((atual) => {
      const existe = atual.find((i) => i.id === produto.id)
      if (existe) {
        return atual.map((i) => (i.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i))
      }
      return [...atual, { ...produto, quantidade }]
    })
  }
  function alterarQuantidade(id, delta) {
    setCarrinho((atual) =>
      atual
        .map((i) => (i.id === id ? { ...i, quantidade: Math.round((i.quantidade + delta) * 100) / 100 } : i))
        .filter((i) => i.quantidade > 0)
    )
  }
  function textoQuantidade(item) {
    if (item.unidadeVenda === 'kg') return `${item.quantidade.toLocaleString('pt-BR')} kg`
    if (item.unidadeVenda === 'kit') return `${item.quantidade.toLocaleString('pt-BR')} kit(s)`
    return `${item.quantidade.toLocaleString('pt-BR')} un.`
  }
  function removerDoCarrinho(id) {
    setCarrinho((atual) => atual.filter((i) => i.id !== id))
  }

  // Só libera cupom e finalização depois de validar um endereço atendido.
  const entregaLiberada = pais === 'Brasil' && endereco?.entregaDisponivel === true && !alertaEntrega && !erroCep

  const subtotal = useMemo(() => carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0), [carrinho])
  const desconto = useMemo(() => {
    let descontoAcumulado = 0
    let restante = subtotal
    for (const cupom of cuponsAplicados) {
      const elegivel = carrinho
        .filter((item) => !cupom.categoria || item.categoria === cupom.categoria)
        .reduce((s, item) => s + item.preco * item.quantidade, 0)
      const bruto = cupom.tipo === 'fixo' ? cupom.valor : (elegivel * cupom.valor) / 100
      const aplicado = Math.min(Math.max(0, Number(bruto) || 0), restante, elegivel)
      descontoAcumulado += aplicado
      restante = Math.max(0, restante - aplicado)
    }
    return Math.min(descontoAcumulado, subtotal)
  }, [carrinho, cuponsAplicados])
  const totalCarrinho = subtotal - desconto

  async function aplicarCupom(e) {
    e.preventDefault()
    setErroCupom('')
    if (!entregaLiberada) {
      setErroCupom('Consulte um CEP atendido antes de aplicar um cupom.')
      return
    }
    if (!codigoCupom.trim()) return setErroCupom('Informe o código do cupom.')
    if (cuponsAplicados.length >= 2) return setErroCupom('Você pode aplicar no máximo 2 cupons por carrinho. Remova um cupom para adicionar outro.')
    setValidandoCupom(true)
    try {
      const resposta = await validarCupomApi(
        codigoCupom.trim(),
        carrinho.map((item) => item.id)
      )
      const cupom = resposta.dados
      // A API também valida a categoria. Esta verificação local mantém a
      // interface coerente mesmo antes de qualquer atualização da tela.
      const possuiCategoria = cupom?.categoria
        ? carrinho.some((i) => i.categoria.toLocaleLowerCase() === cupom.categoria.toLocaleLowerCase())
        : true
      if (!possuiCategoria) {
        throw new Error(`Este cupom é válido apenas para a categoria ${cupom.categoria}.`)
      }
      if (cuponsAplicados.some((item) => String(item.codigo).toLocaleLowerCase() === String(cupom.codigo).toLocaleLowerCase())) {
        throw new Error('Este cupom já está aplicado no carrinho.')
      }
      setCuponsAplicados((atuais) => atuais.length < 2 ? [...atuais, cupom] : atuais)
      setCodigoCupom('')
    } catch (e) {
      setErroCupom(e.message)
    } finally {
      setValidandoCupom(false)
    }
  }
  function removerCupom(codigo) {
    setCuponsAplicados((atuais) => atuais.filter((cupom) => cupom.codigo !== codigo))
    setErroCupom('')
  }

  async function consultarCep(e) {
    e.preventDefault()
    setErroCep('')
    setAlertaEntrega('')
    setEndereco(null)

    if (pais !== 'Brasil') {
      setErroCep('Endereço não suportado.')
      setAlertaEntrega('Endereço não suportado.')
      return
    }

    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) {
      setErroCep('Informe um CEP válido com 8 dígitos.')
      return
    }

    setConsultandoCep(true)
    try {
      const resposta = await buscarCepApi(cepLimpo)
      setEndereco(resposta.dados)
      setCep(resposta.dados?.cep || cepLimpo)
      if (resposta.dados?.entregaDisponivel === false) {
        setAlertaEntrega('Sem transportadora disponível para este endereço.')
      }
    } catch (e) {
      setErroCep(e.message)
    } finally {
      setConsultandoCep(false)
    }
  }


  const mensagemPedido = useMemo(() => {
    if (carrinho.length === 0) return 'Olá! Vim pela Pantanal Pets e gostaria de mais informações.'
    const linhas = carrinho.map((i) => `• ${textoQuantidade(i)} ${i.nome} — ${moeda(i.preco * i.quantidade)}`)
    let texto = `Olá! Quero fazer um pedido na Pantanal Pets:\n\n${linhas.join('\n')}\n\nSubtotal: ${moeda(subtotal)}`
    if (cuponsAplicados.length) texto += `\nCupons aplicados: ${cuponsAplicados.map((cupom) => cupom.codigo).join(', ')}\nDesconto total: -${moeda(desconto)}`
    texto += `\nTotal: ${moeda(totalCarrinho)}`
    if (endereco) {
      const linhaEndereco = [endereco.logradouro, endereco.bairro].filter(Boolean).join(', ')
      const cidade = [endereco.localidade, endereco.uf].filter(Boolean).join(' - ')
      texto += `\n\nEndereço para entrega:`
      if (linhaEndereco) texto += `\n${linhaEndereco}`
      if (cidade) texto += `\n${cidade}`
      if (endereco.cep) texto += `\nCEP: ${endereco.cep}`
    }
    return texto
  }, [carrinho, subtotal, desconto, totalCarrinho, cuponsAplicados, endereco])

  return (
    <div className="loja-cliente-layout">
      <section className="card loja-cliente-produtos">
        <div className="section-heading">
          <div>
            <h2>Produtos</h2>
            <span className="route-tag">GET /api/produtos</span>
          </div>
          <div className="filters">
            <form className="search" onSubmit={onBuscar}>
              <div className="campo-busca-com-icone">
                <IconeTransparente className="icone-pesquisa-link" src={ICONE_URLS.lupa} alt="" />
                <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Pesquisar por nome" />
              </div>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                <option value="nome">Nome</option>
                <option value="preco-asc">Menor preço</option>
                <option value="preco-desc">Maior preço</option>
                <option value="id-desc">Novidades</option>
              </select>
              <button>Buscar</button>
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
            <div className="produtos-grid">
              {produtos.map((p, i) => (
                <article className="produto-card" key={p.id} style={{ '--atraso': `${i * 30}ms` }}>
                  <div className="produto-card-imagem produto-card-imagem-completa" style={{ '--cor': corDe(p.categoria) }}>
                    {p.imagem ? (
                      <img className="produto-imagem-completa" src={p.imagem} alt={p.nome} loading="lazy" decoding="async" />
                    ) : (
                      <IconeCategoria categoria={p.categoria} className="produto-card-icone" />
                    )}
                  </div>
                  <div className="produto-card-corpo">
                    <span className="categoria-tag" style={{ '--cor': corDe(p.categoria) }}>
                      <IconeCategoria categoria={p.categoria} className="icone-categoria" /> {p.categoria}
                    </span>
                    <h3>{p.nome}</h3>
                      {p.descricao && <p className="produto-card-descricao">{p.descricao}</p>}
                      {p.validade && <small className="produto-card-validade">Validade: {new Date(p.validade).toLocaleDateString('pt-BR')}</small>}
                    <strong className="produto-card-preco num">{moeda(p.preco)}{p.unidadeVenda ? ` / ${p.unidadeVenda}` : ''}</strong>
                    {p.unidadeVenda && <label className="produto-quantidade-selecao">Quantidade {p.unidadeVenda === 'kg' ? '(kg)' : '(kits)'}
                      <select value={quantidadeEscolhida(p)} onChange={(e) => setQuantidadesEscolhidas((atual) => ({ ...atual, [p.id]: Number(e.target.value) }))}>
                        {(p.unidadeVenda === 'kg' ? [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10] : [1, 2, 3, 4, 5, 6, 10]).map(q => <option key={q} value={q}>{q.toLocaleString('pt-BR')} {p.unidadeVenda === 'kg' ? 'kg' : q === 1 ? 'kit' : 'kits'}</option>)}
                      </select>
                    </label>}
                    <button type="button" className="adicionar-carrinho-btn" onClick={() => adicionarAoCarrinho(p)}>
                      <><IconeTransparente className="icone-botao icone-carrinho-gif" src={ICONE_URLS.carrinho} alt="" /> <span>Adicionar ao carrinho</span></>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {!carregando && totalPaginas > 1 && (
              <div className="paginacao">
                <button type="button" className="secondary" disabled={pagina <= 1} onClick={() => onPaginar(pagina - 1)}>
                  <IconeTransparente className="icone-url icone-paginacao" src={ICONE_URLS.anterior} alt="" /> Anterior
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
                  <span>Próxima</span> <IconeTransparente className="icone-url icone-paginacao" src={ICONE_URLS.proxima} alt="" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <aside className="card carrinho">
        <h2><IconeTransparente className="icone-carrinho-titulo" src={ICONE_URLS.carrinho} alt="" /> Seu carrinho</h2>

        <section className="consulta-cep" aria-labelledby="consulta-cep-titulo">
          <div className="consulta-cep-cabecalho">
            <div>
              <span className="route-tag">API pública</span>
              <h3 id="consulta-cep-titulo">Consultar endereço</h3>
            </div>
            <span className="consulta-cep-badge">ViaCEP</span>
          </div>
          <p>Informe o país e o CEP para validar a entrega e preencher o endereço automaticamente.</p>
          <div className="consulta-cep-pais">
            <label htmlFor="pais-endereco">País do endereço</label>
            <select
              id="pais-endereco"
              value={pais}
              onChange={(e) => {
                setPais(e.target.value)
                setErroCep('')
                setAlertaEntrega(e.target.value === 'Brasil' ? '' : 'Endereço não suportado.')
                setEndereco(null)
                setCuponsAplicados([])
                setErroCupom('')
              }}
              disabled={consultandoCep}
            >
              <option value="Brasil">Brasil</option>
              <option value="Outro país">Outro país</option>
            </select>
          </div>
          <form className="consulta-cep-form" onSubmit={consultarCep}>
            <input
              value={cep}
              onChange={(e) => {
                setCep(formatarCep(e.target.value))
                setEndereco(null)
                setAlertaEntrega(pais === 'Brasil' ? '' : 'Endereço não suportado.')
                setCuponsAplicados([])
                setErroCupom('')
              }}
              inputMode="numeric"
              maxLength={9}
              placeholder="Ex.: 79300-000"
              aria-label="CEP"
              disabled={consultandoCep}
            />
            <button type="submit" className="secondary consulta-cep-botao" disabled={consultandoCep}>
              {consultandoCep ? 'Consultando...' : 'Consultar'}
            </button>
          </form>
          {erroCep && <p className="erro-campo alerta-entrega">{erroCep}</p>}
          {alertaEntrega && <div className="alerta-entrega" role="alert">{alertaEntrega}</div>}
          {endereco && (
            <div className="endereco-resultado">
              <strong>{endereco.logradouro || 'Logradouro não informado'}</strong>
              {endereco.bairro && <span>{endereco.bairro}</span>}
              {(endereco.localidade || endereco.uf) && (
                <span>{[endereco.localidade, endereco.uf].filter(Boolean).join(' - ')}</span>
              )}
              {endereco.complemento && <span>{endereco.complemento}</span>}
              {endereco.cep && <small>CEP: {endereco.cep}</small>}
              {endereco.entregaDisponivel !== false && <small className="entrega-ok">✓ Endereço dentro da área de atendimento.</small>}
            </div>
          )}
        </section>
        {carrinho.length === 0 ? (
          <p className="status">Seu carrinho está vazio.</p>
        ) : (
          <ul className="carrinho-lista">
            {carrinho.map((i) => (
              <li key={i.id} className="carrinho-item">
                <div>
                  <strong>{i.nome}</strong>
                  <span className="muted num"> {moeda(i.preco)}</span>
                </div>
                <div className="carrinho-item-qtd">
                  <button type="button" className="preco-stepper-seta" onClick={() => alterarQuantidade(i.id, -(i.unidadeVenda === 'kg' ? 0.5 : 1))} aria-label="Diminuir quantidade">
                    <IconeTransparente className="icone-url icone-controle" src={ICONE_URLS.menos} alt="" />
                  </button>
                  <span className="num">{textoQuantidade(i)}</span>
                  <button type="button" className="preco-stepper-seta" onClick={() => alterarQuantidade(i.id, i.unidadeVenda === 'kg' ? 0.5 : 1)} aria-label="Aumentar quantidade">
                    <IconeTransparente className="icone-url icone-controle" src={ICONE_URLS.mais} alt="" />
                  </button>
                  <button type="button" className="carrinho-remover" onClick={() => removerDoCarrinho(i.id)} aria-label="Remover item">
                    <IconeTransparente className="icone-url icone-acao-pequeno" src={ICONE_URLS.excluir} alt="" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!entregaLiberada && <p className="ajuda-entrega-bloqueada">Para aplicar cupom e finalizar pelo WhatsApp, informe um CEP de Corumbá ou Ladário e consulte o endereço.</p>}
        <form className="cupom-aplicar" onSubmit={aplicarCupom}>
          <input
            placeholder="Código do cupom"
            value={codigoCupom}
            onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
            disabled={!entregaLiberada || validandoCupom}
          />
          <button type="submit" className="secondary" disabled={!entregaLiberada || validandoCupom || cuponsAplicados.length >= 2}>
            {validandoCupom ? 'Validando...' : cuponsAplicados.length >= 2 ? 'Limite atingido' : 'Aplicar'}
          </button>
        </form>
        {erroCupom && <p className="erro-campo">{erroCupom}</p>}
        {cuponsAplicados.map((cupom) => (
          <p className="cupom-aplicado-info" key={cupom.codigo}>
            <IconeTransparente className="icone-url icone-sucesso" src={ICONE_URLS.sucesso} alt="" /> Cupom <strong>{cupom.codigo}</strong> aplicado
            <button type="button" className="carrinho-remover" onClick={() => removerCupom(cupom.codigo)} aria-label={`Remover cupom ${cupom.codigo}`}>
              <IconeTransparente className="icone-url icone-acao-pequeno" src={ICONE_URLS.fechar} alt="" />
            </button>
          </p>
        ))}
        <p className="ajuda-cupom-limite">Você pode aplicar até 2 cupons por carrinho ({cuponsAplicados.length}/2).</p>

        <div className="carrinho-resumo">
          <div>
            <span>Subtotal</span>
            <span className="num">{moeda(subtotal)}</span>
          </div>
          {cuponsAplicados.length > 0 && (
            <div>
              <span>Desconto</span>
              <span className="num">-{moeda(desconto)}</span>
            </div>
          )}
          <div className="carrinho-total">
            <span>Total</span>
            <span className="num">{moeda(totalCarrinho)}</span>
          </div>
        </div>

        <section className="vendedores-whatsapp" aria-labelledby="vendedores-titulo">
          <div>
            <span className="route-tag">Atendimento</span>
            <h3 id="vendedores-titulo">Fale com a Pantanal Pets</h3>
            <p>Use o único WhatsApp de atendimento para tirar dúvidas e finalizar seu pedido.</p>
          </div>
          {whatsappNumero ? (
            entregaLiberada ? (
              <WhatsappButton
                numero={whatsappNumero}
                mensagem={mensagemPedido}
                texto="Falar com o vendedor"
                variante="carrinho"
                className="whatsapp-btn-largo"
              />
            ) : (
              <button type="button" className="whatsapp-btn whatsapp-btn-largo whatsapp-btn-desabilitado" disabled title="Consulte primeiro um endereço atendido">
                Falar com o vendedor
              </button>
            )
          ) : (
            <span className="vendedor-indisponivel">WhatsApp não configurado</span>
          )}
        </section>
      </aside>
    </div>
  )
}
