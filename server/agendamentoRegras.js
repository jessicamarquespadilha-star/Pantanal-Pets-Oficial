// Regras de agenda do Banho e Tosa validadas no servidor.
// Mantenha FERIADOS, DIAS_SEM_VAGA e HORARIOS iguais aos de
// frontend/src/components/BanhoTosa.jsx (o navegador só avisa; quem decide é o servidor).
export const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
export const DIAS_SEM_VAGA = new Set(['2026-11-04', '2026-11-23']);
export const FERIADOS = {
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
const FUSO = 'America/Cuiaba';

/** Data (AAAA-MM-DD) e hora (HH:MM) atuais no fuso da loja. */
export function agoraNaLoja(data = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(data).map((p) => [p.type, p.value])
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

export function dataReal(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && new Date(`${texto}T12:00:00Z`).toISOString().slice(0, 10) === texto;
}

/** Retorna a mensagem de erro (string) ou '' quando a data/horário podem ser agendados. */
export function motivoIndisponivel(data, horario, agora = agoraNaLoja()) {
  if (!dataReal(data)) return 'Informe uma data válida.';
  if (!HORARIOS.includes(horario)) return 'Escolha um horário válido.';
  if (data < agora.data || (data === agora.data && horario <= agora.hora)) return 'Escolha uma data e um horário que ainda não passaram.';
  if (DIAS_SEM_VAGA.has(data)) return 'Sem horário disponível para este dia.';
  const feriado = FERIADOS[data.slice(5)];
  if (feriado) return `Neste dia não está disponível por ser feriado: ${feriado}.`;
  return '';
}
