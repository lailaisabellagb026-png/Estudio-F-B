import type { Categoria } from "./catalogo";

export type StatusAgendamento = "pendente" | "confirmado" | "concluido" | "cancelado";

export const NOMES_STATUS: Record<StatusAgendamento, string> = {
  pendente: "A confirmar",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export interface ServicoAgendado {
  id: string;
  nome: string;
  categoria: Categoria;
  preco: number;
  aPartirDe: boolean;
  duracaoMin: number;
}

export interface Agendamento {
  id: string;
  /** Número curto mostrado na comanda. */
  codigo: string;
  nomeCliente: string;
  /** Só dígitos, com DDD. */
  telefone: string;
  data: string;
  hora: string;
  fim: string;
  servicos: ServicoAgendado[];
  resumo: string;
  duracaoMin: number;
  /** Soma dos preços da tabela no momento do agendamento. */
  valor: number;
  aPartirDe: boolean;
  /** Valor realmente cobrado, informado ao concluir. */
  valorCobrado: number | null;
  observacao: string;
  status: StatusAgendamento;
  origem: "site" | "estudio";
  criadoEm: string;
}

/** O que a cliente vê dos próprios horários. */
export type AgendamentoDaCliente = Pick<
  Agendamento,
  "id" | "codigo" | "data" | "hora" | "fim" | "resumo" | "servicos" | "duracaoMin" | "valor" | "aPartirDe" | "status"
>;

/** Dados enviados para criar ou editar um agendamento. */
export interface DadosAgendamento {
  nomeCliente: string;
  telefone: string;
  data: string;
  hora: string;
  servicoIds: string[];
  observacao?: string;
}
