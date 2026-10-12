import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import IconeTransparente from './IconeTransparente.jsx';
import { ICONE_URLS } from '../lib/icones.js';
import {
  criarAgendamento,
  listarAgendamentos,
  listarHorariosOcupados,
  atualizarAgendamento,
  excluirAgendamento,
  listarOpcoesBanhoTosa,
  listarGestaoBanhoTosa,
  criarServicoBanho,
  atualizarServicoBanho,
  excluirServicoBanho,
  criarVeiculoBanho,
  atualizarVeiculoBanho,
  excluirVeiculoBanho,
} from '../services/api.js';

const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};
const dataBR = (v) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const vazios = { servicos: [], veiculos: [] };
// Aceita "45,50", "45.50" e "1.234,50".
const numeroBR = (v) => {
  const t = String(v ?? '')
    .trim()
    .replace(/[R$\s]/g, '');
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
};
const DIAS_SEM_VAGA = new Set(['2026-11-04', '2026-11-23']);
const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const horaAgora = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function chaveData(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}
function nomeFeriado(d) {
  const diaMes = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const feriados = {
    '01-01': 'Confraternização Universal',
    '04-21': 'Tiradentes',
    '05-01': 'Dia Mundial do Trabalho',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Dia Nacional de Zumbi e da Consciência Negra',
    '12-25': 'Natal',
  };
  return feriados[diaMes] || '';
}
function diasDoMes(mes) {
  const ano = mes.getFullYear();
  const numeroMes = mes.getMonth();
  const primeiroDia = new Date(ano, numeroMes, 1).getDay();
  const total = new Date(ano, numeroMes + 1, 0).getDate();
  return [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, numeroMes, i + 1)),
  ];
}

function ClienteBanhoTosa() {
  const [opcoes, setOpcoes] = useState(vazios);
  const [servico, setServico] = useState(null);
  const [carro, setCarro] = useState(null);
  const [data, setData] = useState(hoje());
  const [mesCalendario, setMesCalendario] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [horario, setHorario] = useState('');
  const [ocupados, setOcupados] = useState([]);
  const [cliente, setCliente] = useState('');
  const [pet, setPet] = useState('');
  const [animal, setAnimal] = useState('Cachorro');
  const [raca, setRaca] = useState('');
  const [porte, setPorte] = useState('Médio');
  const [observacoes, setObservacoes] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false);
  const [comprovante, setComprovante] = useState(null);
  const [mostrarComprovante, setMostrarComprovante] = useState(false);
  useEffect(() => {
    listarOpcoesBanhoTosa()
      .then((r) => {
        const d = r.dados || vazios;
        setOpcoes(d);
        setServico(d.servicos?.[0] || null);
      })
      .catch((e) => setMensagem(e.message));
  }, []);
  const carregarOcupados = () =>
    listarHorariosOcupados(data)
      .then((r) => setOcupados(r?.dados || []))
      .catch(() => setOcupados([]));
  useEffect(() => {
    carregarOcupados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  // Quando outro cliente reserva, a lista de horários se atualiza sozinha.
  useEffect(() => {
    const aoAtualizar = () => carregarOcupados();
    window.addEventListener('banho-tosa-atualizado', aoAtualizar);
    return () => window.removeEventListener('banho-tosa-atualizado', aoAtualizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const horariosLivres = HORARIOS.filter(
    (h) => !ocupados.includes(h) && !(data === hoje() && h <= horaAgora())
  );
  useEffect(() => {
    if (agendamentoConfirmado) return;
    if (!horariosLivres.includes(horario)) setHorario(horariosLivres[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horariosLivres.join('|'), agendamentoConfirmado]);
  const total = Number(servico?.valor || 0) + Number(carro?.taxa || 0);
  const dataSemVaga = DIAS_SEM_VAGA.has(data);
  const feriadoSelecionado = nomeFeriado(new Date(`${data}T12:00:00`));
  const dataSemDisponibilidade = dataSemVaga || Boolean(feriadoSelecionado);
  const calendarioDias = diasDoMes(mesCalendario);
  function selecionarDia(dia) {
    if (!dia) return;
    const chave = chaveData(dia);
    setData(chave);
    setHorario(''); // volta ao primeiro horário livre do novo dia
    // O aviso de feriado / sem vaga aparece uma única vez, no quadro abaixo do calendário.
    setMensagem('');
  }
  function mudarMes(delta) {
    setMesCalendario(
      (atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1)
    );
  }
  async function confirmar(e) {
    e.preventDefault();
    if (agendamentoConfirmado) return;
    setMensagem('');
    if (dataSemDisponibilidade) return; // o motivo já está visível abaixo do calendário
    if (!horario) return setMensagem('Escolha um horário disponível.');
    if (!servico) return setMensagem('Escolha um serviço.');
    if (!cliente.trim() || !pet.trim())
      return setMensagem('Informe seu nome e o nome do pet.');
    setEnviando(true);
    try {
      const dados = {
        nomeCliente: cliente.trim(),
        nomePet: pet.trim(),
        animal,
        raca: raca.trim(),
        porte,
        servico: servico.nome,
        valorServico: Number(servico.valor),
        data,
        horario,
        transporte: carro?.nome || null,
        taxaTransporte: Number(carro?.taxa || 0),
        observacoes: observacoes.trim(),
      };
      const r = await criarAgendamento(dados);
      setComprovante({
        ...dados,
        id: r?.dados?.id || r?.dados?.agendamento?.id || null,
        total,
        criadoEm: new Date().toLocaleString('pt-BR'),
      });
      setAgendamentoConfirmado(true);
      setMensagem(
        'Agendamento registrado com sucesso. Agora você pode gerar o comprovante.'
      );
    } catch (e) {
      setMensagem(e.message);
      carregarOcupados();
    } finally {
      setEnviando(false);
    }
  }
  function novoAgendamento() {
    setAgendamentoConfirmado(false);
    setComprovante(null);
    setMostrarComprovante(false);
    setMensagem('');
    setPet('');
    setAnimal('Cachorro');
    setRaca('');
    setPorte('Médio');
    setObservacoes('');
    setCarro(null);
    carregarOcupados();
  }
  function gerarComprovante() {
    if (!agendamentoConfirmado || !comprovante) return;
    setMostrarComprovante(true);
    window.setTimeout(() => window.print(), 150);
  }
  return (
    <section className="banho-tosa-pagina banho-cliente-layout">
      <div className="card banho-tosa-hero">
        <div>
          <span className="eyebrow">Cuidado e bem-estar</span>
          <h2>Banho e Tosa</h2>
          <p>
            Monte seu atendimento em etapas: escolha o serviço, defina se
            precisa de transporte e depois informe os dados do pet e o horário.
          </p>
        </div>
        <div className="banho-tosa-destaque">
          <Icon name="fa-paw" />
          <span>Atendimento com carinho</span>
        </div>
      </div>

      <section className="card servicos-banho banho-etapa">
        <div className="secao-titulo">
          <div>
            <span className="etapa-numero">1</span>
            <span className="eyebrow"> Primeiro passo</span>
            <h3>Escolha o serviço</h3>
            <p>Selecione uma opção para atualizar o valor estimado.</p>
          </div>
          <Icon name="fa-soap" />
        </div>
        <div className="servicos-lista">
          {opcoes.servicos.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={agendamentoConfirmado}
              className={
                servico?.id === s.id ? 'servico-opcao ativo' : 'servico-opcao'
              }
              onClick={() => setServico(s)}
              aria-pressed={servico?.id === s.id}
            >
              <span>
                <strong>{s.nome}</strong>
                <small>{s.descricao}</small>
              </span>
              <b>{moeda(s.valor)}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="card transporte-banho banho-etapa">
        <div className="secao-titulo">
          <div>
            <span className="etapa-numero">2</span>
            <span className="eyebrow"> Opcional</span>
            <h3>Precisa de transporte?</h3>
            <p>
              Escolha um veículo para buscarmos e levarmos seu pet. Você também
              pode continuar sem transporte.
            </p>
          </div>
          <Icon name="fa-car" />
        </div>
        <div className="carros-grid">
          {opcoes.veiculos.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={agendamentoConfirmado}
              className={carro?.id === c.id ? 'carro-card ativo' : 'carro-card'}
              onClick={() => setCarro(carro?.id === c.id ? null : c)}
              aria-pressed={carro?.id === c.id}
            >
              <span className="carro-icone">
                <Icon name={c.icone || 'fa-car'} />
              </span>
              <strong>{c.nome}</strong>
              <span>{c.descricao}</span>
              <b>{moeda(c.taxa)} de taxa</b>
              {carro?.id === c.id && (
                <span className="veiculo-selecionado">
                  <Icon name="fa-check-circle" /> Selecionado
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="transporte-selecao-resumo">
          <Icon name={carro ? 'fa-check-circle' : 'fa-circle-info'} />
          <div>
            <strong>
              {carro
                ? `Veículo escolhido: ${carro.nome}`
                : 'Sem transporte selecionado'}
            </strong>
            <span>
              {carro
                ? `Taxa de transporte: ${moeda(
                    carro.taxa
                  )}. Esse valor será somado ao serviço.`
                : 'O agendamento será feito sem taxa de transporte.'}
            </span>
          </div>
        </div>
      </section>

      <form className="card banho-agendamento banho-etapa" onSubmit={confirmar}>
        <div className="secao-titulo">
          <div>
            <span className="etapa-numero">3</span>
            <span className="eyebrow"> Último passo</span>
            <h3>Dados do pet e horário</h3>
            <p>Confira o resumo antes de confirmar o agendamento.</p>
          </div>
          <Icon name="fa-calendar-days" />
        </div>
        <div className="form-grid-compact">
          <label>
            Seu nome
            <input
              disabled={agendamentoConfirmado}
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              required
              placeholder="Nome do responsável"
            />
          </label>
          <label>
            Nome do pet
            <input
              disabled={agendamentoConfirmado}
              value={pet}
              onChange={(e) => setPet(e.target.value)}
              required
              placeholder="Nome do animal"
            />
          </label>
          <label>
            Animal
            <select
              disabled={agendamentoConfirmado}
              value={animal}
              onChange={(e) => setAnimal(e.target.value)}
              required
            >
              <option value="Cachorro">Cachorro</option>
              <option value="Gato">Gato</option>
              <option value="Outro">Outro</option>
            </select>
          </label>
          <label>
            Raça (opcional)
            <input
              disabled={agendamentoConfirmado}
              value={raca}
              onChange={(e) => setRaca(e.target.value)}
              maxLength={80}
              placeholder="Ex.: Shih-tzu, SRD..."
            />
          </label>
          <label>
            Porte
            <select
              disabled={agendamentoConfirmado}
              value={porte}
              onChange={(e) => setPorte(e.target.value)}
            >
              <option value="">Selecione o porte</option>
              <option>Pequeno</option>
              <option>Médio</option>
              <option>Grande</option>
            </select>
          </label>
          <div className="calendario-agendamento campo-largo">
            <div className="calendario-cabecalho">
              <strong>Escolha a data</strong>
              <div>
                <button
                  type="button"
                  className="secondary btn-pequeno"
                  onClick={() => mudarMes(-1)}
                  disabled={
                    agendamentoConfirmado ||
                    (mesCalendario.getFullYear() === new Date().getFullYear() &&
                      mesCalendario.getMonth() <= new Date().getMonth())
                  }
                  aria-label="Mês anterior"
                >
                  ‹
                </button>
                <span>
                  {NOMES_MESES[mesCalendario.getMonth()]} de{' '}
                  {mesCalendario.getFullYear()}
                </span>
                <button
                  type="button"
                  className="secondary btn-pequeno"
                  onClick={() => mudarMes(1)}
                  disabled={agendamentoConfirmado}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="calendario-grade">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="calendario-dia-semana">
                  {d}
                </span>
              ))}
              {calendarioDias.map((dia, indice) => {
                if (!dia)
                  return (
                    <span
                      key={`vazio-${indice}`}
                      className="calendario-vazio"
                    />
                  );
                const chave = chaveData(dia);
                const semVaga = DIAS_SEM_VAGA.has(chave);
                const feriado = Boolean(nomeFeriado(dia));
                const nomeDoFeriado = nomeFeriado(dia);
                const passado = chave < hoje();
                const classes = [
                  'calendario-dia',
                  semVaga ? 'sem-vaga' : '',
                  feriado ? 'feriado' : '',
                  data === chave ? 'selecionado' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={chave}
                    type="button"
                    className={classes}
                    disabled={agendamentoConfirmado || passado}
                    onClick={() => selecionarDia(dia)}
                    title={
                      semVaga
                        ? 'Sem horário disponível'
                        : feriado
                        ? `Feriado: ${nomeDoFeriado}`
                        : dataBR(chave)
                    }
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="calendario-legenda">
              <span>
                <i className="legenda-sem-vaga" /> Sem vaga
              </span>
              <span>
                <i className="legenda-feriado" /> Feriado
              </span>
            </div>
            <div
              className={`data-escolhida-destaque ${
                feriadoSelecionado
                  ? 'data-escolhida-feriado'
                  : dataSemVaga
                  ? 'data-escolhida-bloqueada'
                  : ''
              }`}
              aria-live="polite"
            >
              <span>Data selecionada</span>
              <strong>{dataBR(data)}</strong>
              {!dataSemDisponibilidade && <small>Data disponível para agendamento</small>}
            </div>
            {dataSemVaga && (
              <div className="aviso-data-sem-vaga" role="alert">
                Sem horário disponível para este dia
              </div>
            )}
            {!dataSemVaga && feriadoSelecionado && (
              <div className="aviso-data-feriado" role="alert">
                Neste dia não está disponível por ser feriado:{' '}
                <strong>{feriadoSelecionado}</strong>.
              </div>
            )}
          </div>
          <label className="campo-largo">
            Horário
            <select
              disabled={agendamentoConfirmado || dataSemDisponibilidade}
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            >
              {horariosLivres.length === 0 && <option value="">Sem horários livres</option>}
              {horariosLivres.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
            {!dataSemDisponibilidade && horariosLivres.length === 0 && (
              <small className="campo-ajuda">
                Todos os horários deste dia já foram reservados. Escolha outra data.
              </small>
            )}
          </label>
        </div>
        <label>
          Observações
          <textarea
            disabled={agendamentoConfirmado}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Alergias, cuidados especiais ou outras informações"
            rows="3"
          />
        </label>
        <div
          className="banho-tosa-cuidados banho-tosa-cuidados-etapa3"
          aria-label="Benefícios do atendimento"
        >
          <span>
            <Icon name="fa-shield-dog" /> <strong>Higiene e segurança</strong>
          </span>
          <span>
            <Icon name="fa-clock" /> <strong>Horários agendados</strong>
          </span>
          <span>
            <Icon name="fa-bell" /> <strong>Confirmação</strong>
          </span>
          <span>
            <Icon name="fa-heart" /> <strong>Atendimento com carinho</strong>
          </span>
        </div>
        <div className="resumo-final-agendamento">
          <div className="resumo-final-cabecalho">
            <Icon name="fa-clipboard-check" />
            <strong>Resumo do agendamento</strong>
          </div>
          <div className="resumo-final-linha">
            <span>Serviço</span>
            <strong>{servico?.nome || 'Nenhum serviço selecionado'}</strong>
          </div>
          <div className="resumo-final-linha">
            <span>Valor do serviço</span>
            <strong>{moeda(servico?.valor || 0)}</strong>
          </div>
          <div className="resumo-final-linha">
            <span>Veículo escolhido</span>
            <strong>{carro?.nome || 'Sem transporte'}</strong>
          </div>
          <div className="resumo-final-linha">
            <span>Taxa de transporte</span>
            <strong>{moeda(carro?.taxa || 0)}</strong>
          </div>
          <div className="banho-total">
            <span>Total estimado</span>
            <strong>{moeda(total)}</strong>
          </div>
        </div>
        <div className="acoes-agendamento">
          <button
            type="submit"
            disabled={
              enviando ||
              !servico ||
              agendamentoConfirmado ||
              dataSemDisponibilidade ||
              !horario
            }
          >
            {enviando
              ? 'Processando...'
              : agendamentoConfirmado
              ? 'Agendamento confirmado'
              : 'Confirmar agendamento'}
          </button>
          <button
            type="button"
            className="botao-secundario"
            onClick={gerarComprovante}
            disabled={!agendamentoConfirmado}
          >
            Gerar comprovante de agendamento
          </button>
          {agendamentoConfirmado && (
            <button type="button" className="botao-secundario" onClick={novoAgendamento}>
              Novo agendamento
            </button>
          )}
        </div>
        {mensagem && (
          <div className="agendamento-sucesso" role="status">
            {mensagem}
          </div>
        )}
        {mostrarComprovante && comprovante && (
          <section
            className="comprovante-agendamento-print"
            aria-label="Comprovante de agendamento"
          >
            <div className="comprovante-cabecalho">
              <h2>Pantanal Pets</h2>
              <h3>Comprovante de agendamento</h3>
              <p>Agendamento registrado</p>
            </div>
            {comprovante.id && (
              <p>
                <strong>Número do agendamento:</strong> {comprovante.id}
              </p>
            )}
            <p>
              <strong>Responsável:</strong> {comprovante.nomeCliente}
            </p>
            <p>
              <strong>Pet:</strong> {comprovante.nomePet}
            </p>
            <p>
              <strong>Animal:</strong> {comprovante.animal || 'Não informado'}
            </p>
            <p>
              <strong>Raça:</strong> {comprovante.raca?.trim() || 'Não informada'}
            </p>
            <p>
              <strong>Porte:</strong> {comprovante.porte || 'Não informado'}
            </p>
            <p>
              <strong>Serviço:</strong> {comprovante.servico}
            </p>
            <p>
              <strong>Data:</strong> {dataBR(comprovante.data)} às{' '}
              {comprovante.horario}
            </p>
            <p>
              <strong>Veículo escolhido:</strong>{' '}
              {comprovante.transporte || 'Sem transporte'}
            </p>
            <p>
              <strong>Taxa de transporte:</strong>{' '}
              {moeda(comprovante.taxaTransporte)}
            </p>
            <p>
              <strong>Valor do serviço:</strong>{' '}
              {moeda(comprovante.valorServico)}
            </p>
            <p className="comprovante-total">
              <strong>Total:</strong> {moeda(comprovante.total)}
            </p>
            {comprovante.observacoes && (
              <p>
                <strong>Observações:</strong> {comprovante.observacoes}
              </p>
            )}
            <small>Gerado em {comprovante.criadoEm}</small>
          </section>
        )}
      </form>
    </section>
  );
}

function AdminBanhoTosa() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [opcoes, setOpcoes] = useState(vazios);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);
  const [novoServico, setNovoServico] = useState({
    nome: '',
    descricao: '',
    valor: '',
  });
  const [novoVeiculo, setNovoVeiculo] = useState({
    nome: '',
    descricao: '',
    taxa: '',
    icone: 'fa-car',
  });
  const [editandoServicoId, setEditandoServicoId] = useState(null);
  const [editandoVeiculoId, setEditandoVeiculoId] = useState(null);
  const formServicoRef = useRef(null);
  const formVeiculoRef = useRef(null);
  const [mensagem, setMensagem] = useState('');
  const [itemPendenteExclusao, setItemPendenteExclusao] = useState(null);
  const [excluindoItem, setExcluindoItem] = useState(false);
  const formEdicaoRef = useRef(null);
  const carregar = async ({ silencioso = false } = {}) => {
    try {
      if (!silencioso) setCarregando(true);
      const [a, o] = await Promise.all([
        listarAgendamentos(),
        listarGestaoBanhoTosa(),
      ]);
      setAgendamentos(a.dados || []);
      setOpcoes(o.dados || vazios);
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    carregar();
  }, []);
  // Atualiza sozinho quando chega novo agendamento ou as opções mudam.
  useEffect(() => {
    const aoAtualizar = () => carregar({ silencioso: true });
    window.addEventListener('banho-tosa-atualizado', aoAtualizar);
    return () =>
      window.removeEventListener('banho-tosa-atualizado', aoAtualizar);
  }, []);
  // Ao clicar em "Editar", leva o formulário (que fica no topo) para a tela.
  useEffect(() => {
    if (editando)
      formEdicaoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
  }, [editando?.id]);
  const pendentes = agendamentos.filter((a) => a.status === 'pendente').length;
  async function salvarAg(e) {
    e.preventDefault();
    if (!editando.data || !editando.horario) {
      setMensagem('Informe data e horário.');
      return;
    }
    try {
      await atualizarAgendamento(editando.id, {
        status: editando.status,
        data: editando.data,
        horario: editando.horario,
      });
      setEditando(null);
      setMensagem('Agendamento atualizado.');
      await carregar();
    } catch (e) {
      setMensagem(e.message);
    }
  }
  function removerAgendamento(agendamento) {
    setMensagem('');
    setItemPendenteExclusao({ tipo: 'agendamento', item: agendamento });
  }
  function limparFormServico() {
    setNovoServico({ nome: '', descricao: '', valor: '' });
    setEditandoServicoId(null);
  }
  async function adicionarServico(e) {
    e.preventDefault();
    try {
      if (editandoServicoId) {
        const atual = opcoes.servicos.find((x) => x.id === editandoServicoId);
        await atualizarServicoBanho(editandoServicoId, {
          nome: novoServico.nome,
          descricao: novoServico.descricao,
          valor: numeroBR(novoServico.valor),
          ativo: atual?.ativo,
        });
        setMensagem('Serviço atualizado.');
      } else {
        await criarServicoBanho(novoServico);
        setMensagem('Serviço adicionado.');
      }
      limparFormServico();
      await carregar();
    } catch (e) {
      setMensagem(e.message);
    }
  }
  // Mesmo método do "Editar produto": carrega o item no formulário do card.
  function editarServico(s) {
    setNovoServico({
      nome: s.nome || '',
      descricao: s.descricao || '',
      valor: String(s.valor ?? ''),
    });
    setEditandoServicoId(s.id);
    requestAnimationFrame(() =>
      formServicoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    );
  }
  function removerServico(s) {
    setMensagem('');
    setItemPendenteExclusao({ tipo: 'servico', item: s });
  }
  function limparFormVeiculo() {
    setNovoVeiculo({ nome: '', descricao: '', taxa: '', icone: 'fa-car' });
    setEditandoVeiculoId(null);
  }
  async function adicionarVeiculo(e) {
    e.preventDefault();
    try {
      if (editandoVeiculoId) {
        const atual = opcoes.veiculos.find((x) => x.id === editandoVeiculoId);
        await atualizarVeiculoBanho(editandoVeiculoId, {
          nome: novoVeiculo.nome,
          descricao: novoVeiculo.descricao,
          taxa: numeroBR(novoVeiculo.taxa),
          icone: atual?.icone || novoVeiculo.icone,
          ativo: atual?.ativo,
        });
        setMensagem('Veículo atualizado.');
      } else {
        await criarVeiculoBanho(novoVeiculo);
        setMensagem('Veículo adicionado.');
      }
      limparFormVeiculo();
      await carregar();
    } catch (e) {
      setMensagem(e.message);
    }
  }
  function editarVeiculo(v) {
    setNovoVeiculo({
      nome: v.nome || '',
      descricao: v.descricao || '',
      taxa: String(v.taxa ?? ''),
      icone: v.icone || 'fa-car',
    });
    setEditandoVeiculoId(v.id);
    requestAnimationFrame(() =>
      formVeiculoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    );
  }
  function removerVeiculo(v) {
    setMensagem('');
    setItemPendenteExclusao({ tipo: 'veiculo', item: v });
  }
  async function confirmarExclusao() {
    if (!itemPendenteExclusao || excluindoItem) return;
    const { tipo, item } = itemPendenteExclusao;
    setExcluindoItem(true);
    try {
      if (tipo === 'agendamento') {
        await excluirAgendamento(item.id);
        if (editando?.id === item.id) setEditando(null);
        setMensagem(`Agendamento #${item.id} excluído com sucesso.`);
      } else if (tipo === 'servico') {
        await excluirServicoBanho(item.id);
        if (editandoServicoId === item.id) limparFormServico();
        setMensagem('Serviço excluído.');
      } else if (tipo === 'veiculo') {
        await excluirVeiculoBanho(item.id);
        if (editandoVeiculoId === item.id) limparFormVeiculo();
        setMensagem('Veículo excluído.');
      }
      setItemPendenteExclusao(null);
      await carregar();
    } catch (e) {
      setMensagem(e.message || 'Não foi possível excluir o item.');
    } finally {
      setExcluindoItem(false);
    }
  }
  return (
    <section className="banho-tosa-pagina">
      <div className="card banho-admin-cabecalho">
        <div>
          <span className="eyebrow">Gestão de serviços</span>
          <h2>Banho e Tosa</h2>
          <p>
            Gerencie agendamentos, valores dos serviços e opções de veículos.
          </p>
        </div>
        <div className="admin-agenda-indicador">
          <Icon name="fa-bell" />
          <strong>{pendentes}</strong>
          <span>pendente(s)</span>
        </div>
      </div>
      {erro && (
        <div className="card aviso">
          <p>{erro}</p>
        </div>
      )}
      {mensagem && <div className="agendamento-sucesso">{mensagem}</div>}
      {editando && (
        <form
          className="card agenda-edicao"
          onSubmit={salvarAg}
          ref={formEdicaoRef}
        >
          <div className="secao-titulo">
            <div>
              <span className="eyebrow">Alterar agendamento</span>
              <h3>
                #{editando.id} — {editando.nomePet}
              </h3>
            </div>
          </div>
          <div className="form-grid-compact">
            <label>
              Status
              <select
                value={editando.status}
                onChange={(e) =>
                  setEditando({ ...editando, status: e.target.value })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                required
                value={editando.data}
                onChange={(e) =>
                  setEditando({ ...editando, data: e.target.value })
                }
              />
            </label>
            <label>
              Horário
              <input
                type="time"
                required
                value={editando.horario}
                onChange={(e) =>
                  setEditando({ ...editando, horario: e.target.value })
                }
              />
            </label>
          </div>
          <div className="agenda-acoes">
            <button type="submit">Salvar alterações</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="card agenda-lista">
        <div className="secao-titulo">
          <div>
            <span className="eyebrow">Agenda</span>
            <h3>Agendamentos recebidos</h3>
          </div>
          <button
            type="button"
            className="secondary btn-pequeno"
            onClick={carregar}
          >
            Atualizar
          </button>
        </div>
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div className="agenda-cards">
            {agendamentos.length === 0 && (
              <p>Nenhum agendamento recebido ainda.</p>
            )}
            {agendamentos.map((a) => (
              <article className="agenda-card" key={a.id}>
                <div className="agenda-card-top">
                  <strong>
                    #{a.id} · {a.nomePet}
                  </strong>
                  <span className={`status-agenda status-${a.status}`}>
                    {a.status}
                  </span>
                </div>
                <div className="agenda-info">
                  <span>
                    <b>Cliente:</b> {a.nomeCliente}
                  </span>
                  <span>
                    <b>Animal:</b> {a.animal || 'Não informado'}
                  </span>
                  <span>
                    <b>Raça:</b> {a.raca?.trim() || 'Não informada'}
                  </span>
                  <span>
                    <b>Porte:</b> {a.porte || 'Não informado'}
                  </span>
                  <span>
                    <b>Serviço:</b> {a.servico}
                  </span>
                  <span>
                    <b>Data:</b> {dataBR(a.data)} às {a.horario}
                  </span>
                  <span>
                    <b>Total:</b>{' '}
                    {moeda(
                      Number(a.valorServico) + Number(a.taxaTransporte || 0)
                    )}
                  </span>
                  {a.transporte && (
                    <span>
                      <b>Transporte:</b> {a.transporte} (+{' '}
                      {moeda(a.taxaTransporte)})
                    </span>
                  )}
                  {a.observacoes && (
                    <span>
                      <b>Observações:</b> {a.observacoes}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="secondary btn-pequeno"
                  onClick={() => setEditando({ ...a })}
                >
                  Editar agendamento
                </button>
                <button
                  type="button"
                  className="btn-excluir-agendamento"
                  onClick={() => removerAgendamento(a)}
                  title="Excluir agendamento"
                  aria-label={`Excluir agendamento #${a.id}`}
                >
                  Excluir agendamento
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="admin-banho-gestao">
        <section className="card">
          <div className="secao-titulo">
            <div>
              <span className="eyebrow">Valores</span>
              <h3>Tabela de serviços</h3>
            </div>
          </div>
          <form
            className="form-grid-compact opcao-form"
            onSubmit={adicionarServico}
            ref={formServicoRef}
          >
            <label>
              Serviço
              <input
                value={novoServico.nome}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, nome: e.target.value })
                }
                required
              />
            </label>
            <label>
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={novoServico.valor}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, valor: e.target.value })
                }
                required
              />
            </label>
            <label className="campo-largo">
              Descrição
              <input
                value={novoServico.descricao}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, descricao: e.target.value })
                }
              />
            </label>
            <div className="form-acoes opcao-acoes">
              <button type="submit">
                {editandoServicoId ? 'Salvar alterações' : 'Adicionar serviço'}
              </button>
              {editandoServicoId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={limparFormServico}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="admin-opcoes-lista">
            {opcoes.servicos.map((s) => (
              <div className="admin-opcao-linha" key={s.id}>
                <div>
                  <strong>{s.nome}</strong>
                  <small>{s.descricao}</small>
                </div>
                <b>{moeda(s.valor)}</b>
                <span>
                  <button
                    className="acao-opcao-editar"
                    type="button"
                    onClick={() => editarServico(s)}
                    title="Editar serviço"
                    aria-label={`Editar ${s.nome}`}
                  >
                    <IconeTransparente
                      className="icone-url icone-acao"
                      src={ICONE_URLS.editar}
                      alt=""
                    />
                  </button>
                  <button
                    className="btn-excluir-icone"
                    type="button"
                    onClick={() => removerServico(s)}
                    title="Excluir serviço"
                    aria-label={`Excluir ${s.nome}`}
                  >
                    <IconeTransparente
                      className="icone-url icone-acao-pequeno"
                      src={ICONE_URLS.excluir}
                      alt=""
                    />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="secao-titulo">
            <div>
              <span className="eyebrow">Transporte</span>
              <h3>Veículos disponíveis</h3>
            </div>
          </div>
          <form
            className="form-grid-compact opcao-form"
            onSubmit={adicionarVeiculo}
            ref={formVeiculoRef}
          >
            <label>
              Veículo
              <input
                value={novoVeiculo.nome}
                onChange={(e) =>
                  setNovoVeiculo({ ...novoVeiculo, nome: e.target.value })
                }
                required
              />
            </label>
            <label>
              Taxa
              <input
                type="number"
                min="0"
                step="0.01"
                value={novoVeiculo.taxa}
                onChange={(e) =>
                  setNovoVeiculo({ ...novoVeiculo, taxa: e.target.value })
                }
                required
              />
            </label>
            <label className="campo-largo">
              Descrição
              <input
                value={novoVeiculo.descricao}
                onChange={(e) =>
                  setNovoVeiculo({ ...novoVeiculo, descricao: e.target.value })
                }
              />
            </label>
            <div className="form-acoes opcao-acoes">
              <button type="submit">
                {editandoVeiculoId ? 'Salvar alterações' : 'Adicionar veículo'}
              </button>
              {editandoVeiculoId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={limparFormVeiculo}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="admin-opcoes-lista">
            {opcoes.veiculos.map((v) => (
              <div className="admin-opcao-linha" key={v.id}>
                <div>
                  <strong>{v.nome}</strong>
                  <small>{v.descricao}</small>
                </div>
                <b>{moeda(v.taxa)}</b>
                <span>
                  <button
                    className="acao-opcao-editar"
                    type="button"
                    onClick={() => editarVeiculo(v)}
                    title="Editar veículo"
                    aria-label={`Editar ${v.nome}`}
                  >
                    <IconeTransparente
                      className="icone-url icone-acao"
                      src={ICONE_URLS.editar}
                      alt=""
                    />
                  </button>
                  <button
                    className="btn-excluir-icone"
                    type="button"
                    onClick={() => removerVeiculo(v)}
                    title="Excluir veículo"
                    aria-label={`Excluir ${v.nome}`}
                  >
                    <IconeTransparente
                      className="icone-url icone-acao-pequeno"
                      src={ICONE_URLS.excluir}
                      alt=""
                    />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {itemPendenteExclusao && (
        <div
          className="modal-aviso-exclusao"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !excluindoItem) setItemPendenteExclusao(null);
          }}
        >
          <section
            className="modal-aviso-exclusao-conteudo"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-item-admin"
            aria-describedby="texto-excluir-item-admin"
          >
            <h3 id="titulo-excluir-item-admin">
              {itemPendenteExclusao.tipo === 'agendamento'
                ? 'Excluir agendamento?'
                : itemPendenteExclusao.tipo === 'servico'
                  ? 'Excluir serviço?'
                  : 'Excluir veículo?'}
            </h3>
            <p id="texto-excluir-item-admin">
              Tem certeza de que deseja excluir{' '}
              {itemPendenteExclusao.tipo === 'agendamento' ? 'o agendamento ' : itemPendenteExclusao.tipo === 'servico' ? 'o serviço ' : 'o veículo '}
              <strong>
                {itemPendenteExclusao.tipo === 'agendamento'
                  ? `#${itemPendenteExclusao.item.id} · ${itemPendenteExclusao.item.nomePet}`
                  : itemPendenteExclusao.item.nome}
              </strong>? Essa ação não pode ser desfeita.
            </p>
            {mensagem && (
              <p className="modal-aviso-exclusao-erro" role="status">
                {mensagem}
              </p>
            )}
            <div className="modal-aviso-exclusao-acoes">
              <button
                type="button"
                className="secondary"
                onClick={() => setItemPendenteExclusao(null)}
                disabled={excluindoItem}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-exclusao"
                onClick={confirmarExclusao}
                disabled={excluindoItem}
              >
                {excluindoItem ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
export default function BanhoTosa({ ehAdmin = false }) {
  return ehAdmin ? <AdminBanhoTosa /> : <ClienteBanhoTosa />;
}
