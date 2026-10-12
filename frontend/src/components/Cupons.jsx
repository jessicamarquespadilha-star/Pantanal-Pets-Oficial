import { useEffect, useState } from 'react'
import { ICONE_URLS } from '../lib/icones.js'
import IconeTransparente from './IconeTransparente.jsx'

function formatarDesconto(c) {
  return c.tipo === 'fixo'
    ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de desconto`
    : `${c.valor}% de desconto`
}

function formatarData(data) {
  if (!data) return 'Sem prazo definido'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 'Data inválida'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const CUPOM_INICIAL = {
  codigo: '', descricao: '', tipo: 'percentual', valor: '',
  categoria: '', validadeTipo: '24h', validadeFim: '', ativo: true,
}

function dadosDoCupom(c) {
  const validadeFim = c?.validadeFim ? new Date(c.validadeFim) : null
  const validadeInicio = c?.validadeInicio ? new Date(c.validadeInicio) : null
  const intervalo = validadeFim && validadeInicio ? validadeFim.getTime() - validadeInicio.getTime() : 0
  const personalizada = Boolean(validadeFim && !Number.isNaN(validadeFim.getTime()) && Math.abs(intervalo - 24 * 60 * 60 * 1000) > 5 * 60 * 1000)
  return {
    codigo: c?.codigo || '',
    descricao: c?.descricao || '',
    tipo: c?.tipo || 'percentual',
    valor: c?.valor ?? '',
    categoria: c?.categoria || '',
    validadeTipo: personalizada ? 'personalizada' : '24h',
    validadeFim: personalizada ? new Date(validadeFim.getTime() - validadeFim.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
    ativo: c?.ativo !== false,
  }
}

export default function Cupons({ cupons = [], modoAdmin, onCriar, onEditar, onExcluir, categorias = [], onCopiar }) {
  const [form, setForm] = useState(CUPOM_INICIAL)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [cupomPendenteExclusao, setCupomPendenteExclusao] = useState(null)
  const [excluindoCupom, setExcluindoCupom] = useState(false)

  useEffect(() => {
    if (!modoAdmin && editandoId) {
      setEditandoId(null)
      setForm(CUPOM_INICIAL)
    }
  }, [modoAdmin, editandoId])

  async function confirmarExclusaoCupom() {
    if (!cupomPendenteExclusao || excluindoCupom) return
    setExcluindoCupom(true)
    try {
      await onExcluir(cupomPendenteExclusao.id)
      setCupomPendenteExclusao(null)
    } finally {
      setExcluindoCupom(false)
    }
  }

  function iniciarEdicao(cupom) {
    setErro('')
    setEditandoId(cupom.id)
    setForm(dadosDoCupom(cupom))
    window.requestAnimationFrame(() => document.getElementById('form-cupom-admin')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setForm(CUPOM_INICIAL)
    setErro('')
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.codigo.trim()) return setErro('Informe o código do cupom.')
    if (!form.valor || Number(form.valor) <= 0) return setErro('Informe um valor de desconto maior que zero.')
    if (form.tipo === 'percentual' && Number(form.valor) > 100) return setErro('O desconto percentual não pode passar de 100%.')
    if (form.validadeTipo === 'personalizada' && !form.validadeFim) return setErro('Informe a data e o horário de término.')
    setEnviando(true)
    try {
      const dados = {
        ...form,
        codigo: form.codigo.trim().toUpperCase(),
        valor: Number(form.valor),
        categoria: form.categoria || null,
        validadeFim: form.validadeTipo === 'personalizada' ? new Date(form.validadeFim).toISOString() : null,
      }
      if (editandoId) {
        await onEditar(editandoId, dados)
      } else {
        await onCriar(dados)
      }
      cancelarEdicao()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function copiar(codigo) {
    try { await navigator.clipboard.writeText(codigo) } catch {}
    setCopiado(codigo)
    onCopiar?.(codigo)
    setTimeout(() => setCopiado(''), 1800)
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <h2><IconeTransparente className="icone-cupom-titulo" src={ICONE_URLS.cupom} alt="" /> Cupons da loja</h2>
          <span className="route-tag">GET /api/cupons</span>
        </div>
      </div>

      {cupons.length === 0 ? (
        <p className="status">Nenhum cupom disponível no momento.</p>
      ) : (
        <div className="cupons-grid">
          {cupons.map((c) => {
            const expirado = c.validadeFim && new Date(c.validadeFim).getTime() <= Date.now()
            const ativo = c.ativo && !expirado
            return (
              <div className={`cupom-card ${ativo ? '' : 'cupom-card-inativo'}`} key={c.id}>
                <div className="cupom-card-topo">
                  <span className="cupom-codigo">{c.codigo}</span>
                  {modoAdmin && <span className={`cupom-status ${ativo ? 'cupom-status-ativo' : ''}`}>{!c.ativo ? 'Inativo' : expirado ? 'Expirado' : 'Ativo'}</span>}
                </div>
                <strong className="cupom-valor">{formatarDesconto(c)}</strong>
                {c.descricao && <p className="muted cupom-desc">{c.descricao}</p>}
                <div className="cupom-condicoes">
                  <span>Categoria: <strong>{c.categoria || 'Todas'}</strong></span>
                  <span>Válido até: <strong>{formatarData(c.validadeFim)}</strong></span>
                </div>
                <div className="cupom-acoes">
                  <button type="button" className="secondary" onClick={() => copiar(c.codigo)}>
                    {copiado === c.codigo ? <>✓ Copiado</> : <><IconeTransparente className="icone-url icone-acao-pequeno" src={ICONE_URLS.copiar} alt="" /> Copiar código</>}
                  </button>
                  {modoAdmin && (
                    <>
                      <button type="button" className="secondary" onClick={() => iniciarEdicao(c)}>Editar cupom</button>
                      <button
                        type="button"
                        className="btn-excluir-icone"
                        onClick={() => setCupomPendenteExclusao(c)}
                        title="Excluir cupom"
                        aria-label={`Excluir cupom ${c.codigo}`}
                      >
                        <IconeTransparente className="icone-url icone-acao" src={ICONE_URLS.excluir} alt="" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modoAdmin && (
        <form id="form-cupom-admin" className="cupom-form" onSubmit={salvar}>
          <h3><IconeTransparente className="icone-cupom-titulo" src={ICONE_URLS.cupom} alt="" /> {editandoId ? 'Editar cupom' : 'Criar novo cupom'}</h3>
          <div className="cupom-form-campos cupom-form-campos-ampliado">
            <label>
              Código
              <input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="ex.: PET10" disabled={enviando} maxLength={40} />
            </label>
            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} disabled={enviando}>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </label>
            <label>
              Valor
              <input type="number" min="0.01" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} disabled={enviando} />
            </label>
            <label>
              Categoria
              <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} disabled={enviando}>
                <option value="">Todas as categorias</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Duração
              <select value={form.validadeTipo} onChange={(e) => setForm((f) => ({ ...f, validadeTipo: e.target.value }))} disabled={enviando}>
                <option value="24h">Duração de 24 horas</option>
                <option value="personalizada">Horário de término estabelecido</option>
              </select>
            </label>
            {form.validadeTipo === 'personalizada' && (
              <label>
                Termina em
                <input type="datetime-local" value={form.validadeFim} onChange={(e) => setForm((f) => ({ ...f, validadeFim: e.target.value }))} disabled={enviando} />
              </label>
            )}
            <label className="cupom-descricao-campo">
              Descrição (opcional)
              <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value.slice(0, 200) }))} placeholder="ex.: promoção de brinquedos" disabled={enviando} />
            </label>
            {editandoId && (
              <label>
                Status
                <select value={form.ativo ? 'ativo' : 'inativo'} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === 'ativo' }))} disabled={enviando}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            )}
          </div>
          <div className="form-acoes">
            <button disabled={enviando}>{enviando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar cupom'}</button>
            {editandoId && <button type="button" className="secondary" onClick={cancelarEdicao} disabled={enviando}>Cancelar</button>}
          </div>
          {erro && <p className="erro">{erro}</p>}
        </form>
      )}

      {cupomPendenteExclusao && (
        <div className="modal-aviso-exclusao" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !excluindoCupom) setCupomPendenteExclusao(null) }}>
          <section className="modal-aviso-exclusao-conteudo" role="alertdialog" aria-modal="true" aria-labelledby="titulo-excluir-cupom" aria-describedby="texto-excluir-cupom">
            <h3 id="titulo-excluir-cupom">Excluir cupom?</h3>
            <p id="texto-excluir-cupom">Tem certeza de que deseja excluir o cupom <strong>{cupomPendenteExclusao.codigo}</strong>? Essa ação não pode ser desfeita.</p>
            <div className="modal-aviso-exclusao-acoes">
              <button type="button" className="secondary" onClick={() => setCupomPendenteExclusao(null)} disabled={excluindoCupom}>Cancelar</button>
              <button type="button" className="btn-confirmar-exclusao" onClick={confirmarExclusaoCupom} disabled={excluindoCupom}>{excluindoCupom ? 'Excluindo...' : 'Sim, excluir'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
