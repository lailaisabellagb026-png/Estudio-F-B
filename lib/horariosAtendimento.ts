export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HorarioDia = {
  ativo: boolean;
  inicio: string;
  fim: string;
};

/** Abre dias que normalmente ficam fechados, ou muda o horário num período. */
export type PeriodoEspecial = {
  id: string;
  inicio: string;
  fim: string;
  dias: DiaSemana[];
  horaInicio: string;
  horaFim: string;
};

/** Fecha o estúdio num intervalo de datas (feriado, folga, férias). */
export type Folga = {
  id: string;
  inicio: string;
  fim: string;
  motivo: string;
};

export type ConfiguracaoHorarios = {
  semana: Record<DiaSemana, HorarioDia>;
  periodosEspeciais: PeriodoEspecial[];
  folgas: Folga[];
};

export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Os horários oferecidos começam de 30 em 30 minutos. */
export const INTERVALO_HORARIOS_MIN = 30;

// Expediente inicial: terça a sexta das 9h às 19h e sábado das 8h às 18h.
export const HORARIOS_PADRAO: ConfiguracaoHorarios = {
  semana: {
    0: { ativo: false, inicio: "09:00", fim: "18:00" },
    1: { ativo: false, inicio: "09:00", fim: "19:00" },
    2: { ativo: true, inicio: "09:00", fim: "19:00" },
    3: { ativo: true, inicio: "09:00", fim: "19:00" },
    4: { ativo: true, inicio: "09:00", fim: "19:00" },
    5: { ativo: true, inicio: "09:00", fim: "19:00" },
    6: { ativo: true, inicio: "08:00", fim: "18:00" },
  },
  periodosEspeciais: [],
  folgas: [],
};

export function horarioValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function normalizarDia(valor: unknown, padrao: HorarioDia): HorarioDia {
  if (!valor || typeof valor !== "object") return { ...padrao };
  const item = valor as Partial<HorarioDia>;
  const inicio = horarioValido(item.inicio) ? item.inicio : padrao.inicio;
  const fim = horarioValido(item.fim) ? item.fim : padrao.fim;
  return {
    ativo: item.ativo === true && horaParaMinutos(inicio) < horaParaMinutos(fim),
    inicio,
    fim,
  };
}

export function normalizarConfiguracaoHorarios(valor: unknown): ConfiguracaoHorarios {
  const bruto = valor && typeof valor === "object" ? (valor as Partial<ConfiguracaoHorarios>) : {};
  const semana = {} as Record<DiaSemana, HorarioDia>;
  for (let dia = 0; dia <= 6; dia += 1) {
    const chave = dia as DiaSemana;
    semana[chave] = normalizarDia(bruto.semana?.[chave], HORARIOS_PADRAO.semana[chave]);
  }

  const periodosEspeciais = Array.isArray(bruto.periodosEspeciais)
    ? bruto.periodosEspeciais.flatMap((valorPeriodo, indice): PeriodoEspecial[] => {
      if (!valorPeriodo || typeof valorPeriodo !== "object") return [];
      const item = valorPeriodo as Partial<PeriodoEspecial>;
      const dias = Array.isArray(item.dias)
        ? [...new Set(item.dias)].filter((dia): dia is DiaSemana => Number.isInteger(dia) && dia >= 0 && dia <= 6)
        : [];
      if (
        !dataValida(item.inicio) ||
        !dataValida(item.fim) ||
        item.inicio > item.fim ||
        dias.length === 0 ||
        !horarioValido(item.horaInicio) ||
        !horarioValido(item.horaFim) ||
        horaParaMinutos(item.horaInicio) >= horaParaMinutos(item.horaFim)
      ) return [];
      return [{
        id: typeof item.id === "string" && item.id ? item.id : `periodo-${indice}`,
        inicio: item.inicio,
        fim: item.fim,
        dias,
        horaInicio: item.horaInicio,
        horaFim: item.horaFim,
      }];
    })
    : [];

  const folgas = Array.isArray(bruto.folgas)
    ? bruto.folgas.flatMap((valorFolga, indice): Folga[] => {
      if (!valorFolga || typeof valorFolga !== "object") return [];
      const item = valorFolga as Partial<Folga>;
      if (!dataValida(item.inicio) || !dataValida(item.fim) || item.inicio > item.fim) return [];
      return [{
        id: typeof item.id === "string" && item.id ? item.id : `folga-${indice}`,
        inicio: item.inicio,
        fim: item.fim,
        motivo: typeof item.motivo === "string" ? item.motivo.trim().slice(0, 60) : "",
      }];
    })
    : [];

  return { semana, periodosEspeciais, folgas };
}

/** Problema que impede salvar o expediente, ou null se estiver tudo certo. */
export function problemaNoExpediente(configuracao: ConfiguracaoHorarios): string | null {
  for (let dia = 0; dia <= 6; dia += 1) {
    const item = configuracao.semana[dia as DiaSemana];
    if (item.ativo && horaParaMinutos(item.inicio) >= horaParaMinutos(item.fim)) {
      return `${NOMES_DIAS[dia]}: o horário de abertura precisa ser antes do fechamento.`;
    }
  }
  for (const periodo of configuracao.periodosEspeciais) {
    if (!dataValida(periodo.inicio) || !dataValida(periodo.fim) || periodo.inicio > periodo.fim) {
      return "Horário especial: a data inicial precisa ser igual ou anterior à final.";
    }
    if (periodo.dias.length === 0) return "Horário especial: marque pelo menos um dia da semana.";
    if (horaParaMinutos(periodo.horaInicio) >= horaParaMinutos(periodo.horaFim)) {
      return "Horário especial: a abertura precisa ser antes do fechamento.";
    }
  }
  for (const folga of configuracao.folgas) {
    if (!dataValida(folga.inicio) || !dataValida(folga.fim) || folga.inicio > folga.fim) {
      return "Folga: a data inicial precisa ser igual ou anterior à final.";
    }
  }
  return null;
}

export function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosParaHora(totalMin: number) {
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

export function temConflito(inicioNovo: number, fimNovo: number, inicioExistente: number, fimExistente: number) {
  return inicioNovo < fimExistente && fimNovo > inicioExistente;
}

export function diaDaSemana(dataISO: string) {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay() as DiaSemana;
}

export function folgaNaData(dataISO: string, configuracao: ConfiguracaoHorarios) {
  return configuracao.folgas.find((folga) => folga.inicio <= dataISO && folga.fim >= dataISO) ?? null;
}

export function obterExpediente(dataISO: string, configuracao: ConfiguracaoHorarios = HORARIOS_PADRAO): HorarioDia {
  const folga = folgaNaData(dataISO, configuracao);
  const dia = diaDaSemana(dataISO);
  if (folga) return { ...configuracao.semana[dia], ativo: false };
  // O último período cadastrado ganha prioridade, para corrigir um horário
  // especial sem apagar o anterior.
  const especial = [...configuracao.periodosEspeciais].reverse().find((periodo) => (
    periodo.inicio <= dataISO && periodo.fim >= dataISO && periodo.dias.includes(dia)
  ));
  if (especial) return { ativo: true, inicio: especial.horaInicio, fim: especial.horaFim };
  return configuracao.semana[dia];
}

export function dataEstaAberta(dataISO: string, configuracao: ConfiguracaoHorarios = HORARIOS_PADRAO) {
  return obterExpediente(dataISO, configuracao).ativo;
}

/** Horários de início possíveis num dia, sem olhar a agenda. */
export function horariosDoDia(dataISO: string, configuracao: ConfiguracaoHorarios = HORARIOS_PADRAO) {
  const expediente = obterExpediente(dataISO, configuracao);
  const abertura = horaParaMinutos(expediente.inicio);
  const fechamento = horaParaMinutos(expediente.fim);
  if (!expediente.ativo) return { horarios: [] as string[], abertura, fechamento };
  const horarios: string[] = [];
  for (let minuto = abertura; minuto < fechamento; minuto += INTERVALO_HORARIOS_MIN) {
    horarios.push(minutosParaHora(minuto));
  }
  return { horarios, abertura, fechamento };
}

export function somarDias(dataISO: string, dias: number) {
  const data = new Date(`${dataISO}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function diasEntre(deISO: string, ateISO: string) {
  return Math.round(
    (new Date(`${ateISO}T12:00:00Z`).getTime() - new Date(`${deISO}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Texto curto dos dias abertos, ex.: "Terça a sábado". */
export function resumoDiasAbertos(configuracao: ConfiguracaoHorarios) {
  const abertos = ([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).filter((dia) => configuracao.semana[dia].ativo);
  if (abertos.length === 0) return "";
  if (abertos.length === 7) return "Todos os dias";
  const nome = (dia: DiaSemana) => NOMES_DIAS[dia].toLocaleLowerCase("pt-BR");
  if (abertos.length === 1) return `Só ${nome(abertos[0])}`;
  const emSequencia = abertos.every((dia, i) => i === 0 || dia === abertos[i - 1] + 1);
  if (emSequencia) {
    const texto = `${nome(abertos[0])} a ${nome(abertos[abertos.length - 1])}`;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  return abertos.map((dia) => NOMES_DIAS[dia].slice(0, 3)).join(", ");
}

/** "9h às 19h" quando todos os dias abertos têm o mesmo horário; senão, vazio. */
export function resumoHorario(configuracao: ConfiguracaoHorarios) {
  const abertos = Object.values(configuracao.semana).filter((dia) => dia.ativo);
  if (abertos.length === 0) return "";
  const iguais = abertos.every((dia) => dia.inicio === abertos[0].inicio && dia.fim === abertos[0].fim);
  if (!iguais) return "";
  const curto = (hora: string) => {
    const minutos = horaParaMinutos(hora);
    return minutos % 60 === 0 ? `${minutos / 60}h` : `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
  };
  return `${curto(abertos[0].inicio)} às ${curto(abertos[0].fim)}`;
}
