import type { ReactNode } from "react";
import { ESTUDIO } from "@/lib/estudio";
import { formatarDataLonga, formatarDuracao, formatarPreco, formatarPrecoCurto } from "@/lib/formatos";
import type { AgendamentoDaCliente, StatusAgendamento } from "@/lib/tipos";

const TEXTO_STATUS: Record<StatusAgendamento, string> = {
  pendente: "Aguardando confirmação do estúdio",
  confirmado: "Confirmado pelo estúdio",
  concluido: "Atendimento concluído",
  cancelado: "Cancelado",
};

/**
 * A comanda do salão: o papel com os serviços e o total que acompanha a
 * cliente. Aqui ela resume o horário reservado.
 */
export function Comanda({ agendamento, children }: { agendamento: AgendamentoDaCliente; children?: ReactNode }) {
  const { codigo, data, hora, fim, servicos, duracaoMin, valor, aPartirDe, status } = agendamento;

  return (
    <article className="picote bg-white px-6 pb-8 pt-9 text-giz shadow-[0_24px_60px_-30px_rgba(60,20,20,0.35)]">
      <header className="flex items-baseline justify-between gap-3">
        <p className="rotulo text-vermelho">Comanda</p>
        <p className="rotulo tabular-nums text-cinza-papel">Nº {codigo}</p>
      </header>
      <p className="mt-1 text-xs text-cinza-papel">{ESTUDIO.nome}</p>

      <hr className="my-5 border-dashed border-giz/20" />

      <p className="text-sm font-medium">{formatarDataLonga(data)}</p>
      <p className="mt-1 font-display text-5xl leading-none">
        {hora}
        <span className="ml-3 font-sans text-base text-cinza-papel">até {fim}</span>
      </p>

      <hr className="my-5 border-dashed border-giz/20" />

      <ul className="space-y-2.5 text-[15px]">
        {servicos.map((servico) => (
          <li key={servico.id} className="flex items-baseline">
            <span>{servico.nome}</span>
            <span className="guia" />
            <span className="whitespace-nowrap tabular-nums">
              {servico.aPartirDe && servico.preco > 0 && <span className="text-xs text-cinza-papel">a partir de </span>}
              {formatarPrecoCurto(servico.preco)}
            </span>
          </li>
        ))}
      </ul>

      <hr className="my-5 border-dashed border-giz/20" />

      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-cinza-papel">
          {formatarDuracao(duracaoMin)} de atendimento
          <br />
          Total{aPartirDe ? " a partir de" : ""}
        </p>
        <p className="font-display text-3xl leading-none tabular-nums">{formatarPreco(valor)}</p>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${status === "pendente" ? "bg-vermelho" : status === "cancelado" ? "bg-cinza-papel" : "bg-giz"}`}
        />
        {TEXTO_STATUS[status]}
      </p>

      {children}
    </article>
  );
}
