import { useEffect, useRef, useState } from 'react';
import { ICONE_URLS } from '../lib/icones.js';
import IconeTransparente from './IconeTransparente.jsx';
import { processarImagem } from '../lib/imagem.js';

const CATEGORIAS_PADRAO = [
  'Alimentação',
  'Acessório',
  'Higiene',
  'Saúde e Farmácia',
  'Brinquedos',
];
const LIMITE_NOME = 120;
const LIMITE_DIGITOS_PRECO = 11;
const PASSO_PRECO_CENTAVOS = 100;
const LIMITE_IMAGEM_MB = 5;
const inicial = {
  nome: '',
  categoria: '',
  precoCentavos: '',
  descricao: '',
  validade: '',
  unidadeVenda: '',
  imagem: '',
};

function formatarMoeda(centavos) {
  const valor = Number(centavos || 0) / 100;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function estadoInicialDoForm(editando) {
  if (!editando) return inicial;
  return {
    nome: editando.nome,
    categoria: editando.categoria,
    precoCentavos: String(Math.round(Number(editando.preco) * 100)),
    descricao: editando.descricao || '',
    validade: editando.validade ? String(editando.validade).slice(0, 10) : '',
    unidadeVenda: editando.unidadeVenda || '',
    imagem: editando.imagem || '',
  };
}

export default function ProdutoForm({
  onSalvar,
  editando,
  onCancelar,
  categorias = [],
}) {
  const [form, setForm] = useState(() => estadoInicialDoForm(editando));
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const precoRef = useRef(null);
  const arquivoRef = useRef(null);

  const lista = [...new Set([...categorias, ...CATEGORIAS_PADRAO])].sort(
    (a, b) => a.localeCompare(b, 'pt-BR')
  );

  function alterarNome(e) {
    setForm((f) => ({ ...f, nome: e.target.value.slice(0, LIMITE_NOME) }));
  }
  function alterarCategoria(e) {
    setForm((f) => ({ ...f, categoria: e.target.value }));
  }
  function alterarDescricao(e) {
    setForm((f) => ({ ...f, descricao: e.target.value.slice(0, 500) }));
  }
  function alterarValidade(e) {
    setForm((f) => ({ ...f, validade: e.target.value }));
  }
  function alterarPreco(e) {
    const digitos = e.target.value
      .replace(/\D/g, '')
      .slice(0, LIMITE_DIGITOS_PRECO);
    setForm((f) => ({ ...f, precoCentavos: digitos }));
  }
  function moverCursorParaFim(e) {
    const valor = e.target.value;
    requestAnimationFrame(() =>
      e.target.setSelectionRange(valor.length, valor.length)
    );
  }
  function ajustarPreco(delta) {
    setForm((f) => {
      const atual = Number(f.precoCentavos || 0);
      const novo = Math.max(0, Math.min(99999999999, atual + delta));
      return { ...f, precoCentavos: novo === 0 ? '' : String(novo) };
    });
  }

  useEffect(() => {
    const el = precoRef.current;
    if (el && document.activeElement === el) {
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [form.precoCentavos]);

  async function selecionarImagem(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      setErros((er) => ({
        ...er,
        imagem: 'Selecione um arquivo de imagem válido.',
      }));
      return;
    }
    if (arquivo.size > LIMITE_IMAGEM_MB * 1024 * 1024) {
      setErros((er) => ({
        ...er,
        imagem: `A imagem deve ter no máximo ${LIMITE_IMAGEM_MB}MB.`,
      }));
      return;
    }
    setProcessandoImagem(true);
    try {
      const dataUrl = await processarImagem(arquivo);
      setForm((f) => ({ ...f, imagem: dataUrl }));
      setErros((er) => ({ ...er, imagem: undefined }));
    } catch {
      setErros((er) => ({ ...er, imagem: 'Não foi possível ler a imagem.' }));
    } finally {
      setProcessandoImagem(false);
    }
  }
  function removerImagem() {
    setForm((f) => ({ ...f, imagem: '' }));
    if (arquivoRef.current) arquivoRef.current.value = '';
  }

  function limpar() {
    setForm(inicial);
    setErros({});
    setSalvo(false);
    if (arquivoRef.current) arquivoRef.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    const nome = form.nome.trim();
    const preco = Number(form.precoCentavos || 0) / 100;

    const novosErros = {};
    if (!nome) novosErros.nome = 'Informe o nome do produto.';
    if (!form.categoria) novosErros.categoria = 'Selecione uma categoria.';
    if (!form.precoCentavos || preco <= 0)
      novosErros.preco = 'Informe um preço válido, maior que zero.';

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    setSalvo(false);
    try {
      await onSalvar({
        nome,
        categoria: form.categoria,
        preco,
        descricao: form.descricao.trim(),
        validade: form.validade || null,
        unidadeVenda: form.unidadeVenda || null,
        imagem: form.imagem || null,
      });
      setSalvo(true);
      if (!editando) limpar();
      setTimeout(() => setSalvo(false), 2500);
    } catch (erro) {
      if (erro.status !== 401) setErros({ geral: erro.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card admin-produto-form-card">
      <div className="admin-card-heading">
        <div>
          <h2>{editando ? 'Editar produto' : 'Cadastrar produto'}</h2>
          <p>Preencha os dados abaixo para manter o catálogo organizado.</p>
        </div>
        <span className="route-tag">
          {editando ? 'PUT /api/produtos/:id' : 'POST /api/produtos'}
        </span>
      </div>

      <form className="product-form" onSubmit={submit}>
        <label>
          Nome
          <input
            name="nome"
            value={form.nome}
            onChange={alterarNome}
            disabled={enviando}
            maxLength={LIMITE_NOME}
          />
          <span className="campo-ajuda">
            {erros.nome ? (
              <span className="erro-campo">{erros.nome}</span>
            ) : (
              <span className="contador">
                {form.nome.length}/{LIMITE_NOME}
              </span>
            )}
          </span>
        </label>

        <label>
          Categoria
          <select
            name="categoria"
            value={form.categoria}
            onChange={alterarCategoria}
            disabled={enviando}
          >
            <option value="">Selecione</option>
            {lista.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {erros.categoria && (
            <span className="erro-campo">{erros.categoria}</span>
          )}
        </label>

        <label>
          Preço
          <div className="preco-stepper">
            <input
              ref={precoRef}
              name="preco"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={
                form.precoCentavos ? formatarMoeda(form.precoCentavos) : ''
              }
              onChange={alterarPreco}
              onFocus={moverCursorParaFim}
              onClick={moverCursorParaFim}
              disabled={enviando}
            />
            <div className="preco-stepper-setas">
              <button
                type="button"
                className="preco-stepper-seta"
                onClick={() => ajustarPreco(PASSO_PRECO_CENTAVOS)}
                disabled={enviando}
                title="Aumentar R$ 1,00"
                aria-label="Aumentar preço"
              >
                <IconeTransparente
                  className="icone-url icone-controle"
                  src={ICONE_URLS.mais}
                  alt=""
                />
              </button>
              <button
                type="button"
                className="preco-stepper-seta"
                onClick={() => ajustarPreco(-PASSO_PRECO_CENTAVOS)}
                disabled={enviando}
                title="Diminuir R$ 1,00"
                aria-label="Diminuir preço"
              >
                <IconeTransparente
                  className="icone-url icone-controle"
                  src={ICONE_URLS.menos}
                  alt=""
                />
              </button>
            </div>
          </div>
          {erros.preco && <span className="erro-campo">{erros.preco}</span>}
        </label>

        <div className="mb-3 campo-imagem">
          <label htmlFor="formFile" className="form-label">
            Imagem do produto
          </label>
          <div className="imagem-linha">
            <div className="imagem-controles">
              <input
                ref={arquivoRef}
                type="file"
                id="formFile"
                accept="image/*"
                onChange={selecionarImagem}
                disabled={enviando || processandoImagem}
                className="form-control"
              />
              {form.imagem && (
                <button
                  type="button"
                  className="imagem-remover"
                  onClick={removerImagem}
                  disabled={enviando}
                >
                  <IconeTransparente
                    className="icone-url icone-acao-pequeno"
                    src={ICONE_URLS.remover}
                    alt=""
                  />{' '}
                  Remover imagem
                </button>
              )}
            </div>
            {form.imagem && (
              <img
                className="imagem-miniatura"
                src={form.imagem}
                alt="Pré-visualização do produto"
              />
            )}
          </div>
          <span className="campo-ajuda">
            {erros.imagem ? (
              <span className="erro-campo">{erros.imagem}</span>
            ) : (
              processandoImagem && (
                <span className="contador">Otimizando imagem...</span>
              )
            )}
          </span>
        </div>

        <label className="campo-descricao">
          Descrição do produto
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={alterarDescricao}
            placeholder="Ex.: alimento completo para cães adultos, sabor frango..."
            rows={3}
            maxLength={500}
            disabled={enviando}
          />
          <small className="campo-ajuda">
            {form.descricao.length}/500 caracteres
          </small>
        </label>

        <label>
          Unidade de venda <span className="campo-opcional">(opcional)</span>
          <select
            name="unidadeVenda"
            value={form.unidadeVenda}
            onChange={(e) =>
              setForm((f) => ({ ...f, unidadeVenda: e.target.value }))
            }
            disabled={enviando}
          >
            <option value="">Sem seleção especial</option>
            <option value="kg">Por kg</option>
            <option value="kit">Por kit</option>
          </select>
        </label>

        <label>
          Data de validade{' '}
          <span className="campo-opcional">
            (para produtos não duráveis, deixe em branco)
          </span>
          <input
            type="date"
            name="validade"
            value={form.validade}
            onChange={alterarValidade}
            disabled={enviando}
          />
        </label>

        <div className="form-acoes">
          <button disabled={enviando || processandoImagem}>
            {enviando
              ? 'Salvando...'
              : editando
              ? 'Salvar alterações'
              : 'Cadastrar'}
          </button>
          {editando ? (
            <button
              type="button"
              className="secondary"
              onClick={onCancelar}
              disabled={enviando}
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              onClick={limpar}
              disabled={enviando}
            >
              Limpar
            </button>
          )}
        </div>
      </form>

      {erros.geral && <p className="erro">{erros.geral}</p>}
      {salvo && (
        <p className="sucesso-inline">
          <IconeTransparente
            className="icone-url icone-sucesso"
            src={ICONE_URLS.sucesso}
            alt=""
          />{' '}
          {editando ? 'Alterações salvas.' : 'Produto cadastrado.'}
        </p>
      )}
    </section>
  );
}
