import {
  ConfiguracaoHorarios,
  dataEstaAberta,
  horaParaMinutos,
  horariosDoDia,
  somarDias,
  temConflito,
} from "./horariosAtendimento";
import type { Agora } from "./tempo";

/** Até quantos dias à frente a cliente consegue agendar. */
export const DIAS_PARA_AGENDAR = 60;

/** Horários de hoje só aparecem se começarem pelo menos este tempo depois de agora. */
export const ANTECEDENCIA_MINIMA_MIN = 30;

/** Intervalo já reservado num dia, sem dados da cliente. */
export interface Ocupado {
  inicio: string;
  fim: string;
}

/** A partir de que minuto do dia ainda dá para começar um atendimento. */
export function inicioPermitido(data: string, agora: Agora) {
  if (data < agora.data) return Number.POSITIVE_INFINITY;
  return data === agora.data ? agora.minutos + ANTECEDENCIA_MINIMA_MIN : 0;
}

export function horariosLivres({
  data,
  duracaoMin,
  configuracao,
  ocupados,
  aPartirDeMin = 0,
}: {
  data: string;
  duracaoMin: number;
  configuracao: ConfiguracaoHorarios;
  ocupados: Ocupado[];
  aPartirDeMin?: number;
}) {
  if (duracaoMin <= 0) return [];
  const { horarios, abertura, fechamento } = horariosDoDia(data, configuracao);
  if (horarios.length === 0) return [];
  // Além da grade de 30 em 30 minutos, oferece o horário exato em que cada
  // atendimento termina, para o próximo começar sem intervalo vazio.
  const fins = ocupados
    .map((item) => item.fim)
    .filter((hora) => horaParaMinutos(hora) >= abertura && horaParaMinutos(hora) < fechamento);
  const candidatos = [...new Set([...horarios, ...fins])].sort();
  return candidatos.filter((horario) => {
    const inicio = horaParaMinutos(horario);
    const fim = inicio + duracaoMin;
    if (inicio < aPartirDeMin || fim > fechamento) return false;
    return !ocupados.some((item) => temConflito(inicio, fim, horaParaMinutos(item.inicio), horaParaMinutos(item.fim)));
  });
}

/** Dias abertos dentro da janela de agendamento que ainda têm algum horário. */
export function datasParaAgendar(configuracao: ConfiguracaoHorarios, agora: Agora) {
  const datas: string[] = [];
  for (let i = 0; i <= DIAS_PARA_AGENDAR; i += 1) {
    const data = somarDias(agora.data, i);
    if (!dataEstaAberta(data, configuracao)) continue;
    const aPartirDe = inicioPermitido(data, agora);
    const { horarios } = horariosDoDia(data, configuracao);
    if (horarios.some((horario) => horaParaMinutos(horario) >= aPartirDe)) datas.push(data);
  }
  return datas;
}
