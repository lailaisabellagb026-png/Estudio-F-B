// O estúdio funciona no horário de Brasília. O servidor da Vercel roda em
// UTC, então "agora" é sempre calculado neste fuso, no servidor e no celular.
export const FUSO_DO_ESTUDIO = "America/Sao_Paulo";

const formatador = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_DO_ESTUDIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface Agora {
  /** Data de hoje no estúdio, AAAA-MM-DD. */
  data: string;
  /** Minutos passados desde a meia-noite no estúdio. */
  minutos: number;
}

export function agoraNoEstudio(momento: Date = new Date()): Agora {
  const partes = Object.fromEntries(formatador.formatToParts(momento).map((parte) => [parte.type, parte.value]));
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}
