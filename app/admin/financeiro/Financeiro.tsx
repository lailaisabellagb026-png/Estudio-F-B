"use client";

import { useMemo, useState } from "react";
import { IconeSeta } from "@/components/Icones";
import { useAgendamentos } from "@/components/painel/useAgendamentos";
import { formatarDataCurta, formatarDataLonga, formatarPreco, partesDaData, plural } from "@/lib/formatos";
import { diaDaSemana, diasEntre, somarDias } from "@/lib/horariosAtendimento";
import { useAgora } from "@/lib/noNavegador";
import type { Agendamento } from "@/lib/tipos";

type Periodo = "dia" | "semana" | "mes";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function intervalo(periodo: Periodo, referencia: string) {
  if (!referencia) return { de: "", ate: "", titulo: "" };
  if (periodo === "dia") return { de: referencia, ate: referencia, titulo: formatarDataLonga(referencia) };
  if (periodo === "semana") {
    // Semana de segunda a domingo.
    const de = somarDias(referencia, -((diaDaSemana(referencia) + 6) % 7));
    const ate = somarDias(de, 6);
    return { de, ate, titulo: `${formatarDataCurta(de)} a ${formatarDataCurta(ate)}` };
  }
  const [ano, mes] = referencia.split("-").map(Number);
  const de = `${referencia.slice(0, 7)}-01`;
  const ate = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  return { de, ate, titulo: `${MESES[mes - 1].charAt(0).toUpperCase()}${MESES[mes - 1].slice(1)} de ${ano}` };
}

function mover(periodo: Periodo, referencia: string, passo: number) {
  if (periodo === "dia") return somarDias(referencia, passo);
  if (periodo === "semana") return somarDias(referencia, passo * 7);
  const [ano, mes] = referencia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + passo, 1));
  return data.toISOString().slice(0, 10);
}

const valorRecebido = (a: Agendamento) => a.valorCobrado ?? a.valor;

export function Financeiro() {
  const agora = useAgora();
  const hoje = agora?.data ?? "";
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [referenciaEscolhida, setReferencia] = useState<string | null>(null);
  const referencia = referenciaEscolhida ?? hoje;
  const { de, ate, titulo } = intervalo(periodo, referencia);
  const { agendamentos, carregando, erro, recarregar } = useAgendamentos(de, ate);

  const concluidos = useMemo(() => agendamentos.filter((a) => a.status === "concluido"), [agendamentos]);
  const recebido = concluidos.reduce((soma, a) => soma + valorRecebido(a), 0);
  const emAberto = agendamentos.filter((a) => a.status === "pendente" || a.status === "confirmado");
  const previsto = emAberto.reduce((soma, a) => soma + a.valor, 0);
  const ticketMedio = concluidos.length > 0 ? recebido / concluidos.length : 0;

  const porDia = useMemo(() => {
    if (!de || periodo === "dia") return [];
    return Array.from({ length: diasEntre(de, ate) + 1 }, (_, i) => {
      const data = somarDias(de, i);
      const doDia = concluidos.filter((a) => a.data === data);
      return { data, valor: doDia.reduce((soma, a) => soma + valorRecebido(a), 0), quantidade: doDia.length };
    });
  }, [concluidos, de, ate, periodo]);

  const maisFeitos = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const a of concluidos) for (const servico of a.servicos) contagem.set(servico.nome, (contagem.get(servico.nome) ?? 0) + 1);
    return [...contagem.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  }, [concluidos]);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-6 pt-8">
      <h1 className="font-display text-[2.4rem] font-medium leading-tight">Financeiro</h1>
      <p className="mt-1 text-cinza">Conta só atendimentos concluídos, pelo valor cobrado.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex rounded-full border border-linha p-1">
          {(
            [
              ["dia", "Dia"],
              ["semana", "Semana"],
              ["mes", "Mês"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={periodo === valor}
              onClick={() => setPeriodo(valor)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${periodo === valor ? "bg-giz font-medium text-white" : "text-cinza hover:text-giz"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReferencia(mover(periodo, referencia, -1))}
            aria-label="Período anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-linha text-cinza hover:text-giz"
          >
            <IconeSeta direcao="esquerda" />
          </button>
          <p className="min-w-[10rem] text-center font-medium">{titulo}</p>
          <button
            type="button"
            onClick={() => setReferencia(mover(periodo, referencia, 1))}
            aria-label="Próximo período"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-linha text-cinza hover:text-giz"
          >
            <IconeSeta />
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-6 border-l-2 border-vermelho-vivo pl-3 text-sm">
          {erro}{" "}
          <button type="button" onClick={recarregar} className="font-medium text-vermelho-vivo underline">
            Tentar de novo
          </button>
        </p>
      )}

      <section className={`mt-8 ${carregando ? "opacity-50" : ""}`} aria-busy={carregando}>
        <p className="rotulo text-cinza">Recebido</p>
        <p className="mt-1 font-display text-6xl leading-none tabular-nums">{formatarPreco(recebido)}</p>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-linha rounded-2xl border border-linha">
          <Numero rotulo="Atendimentos" valor={String(concluidos.length)} />
          <Numero rotulo="Ticket médio" valor={formatarPreco(ticketMedio)} />
          <Numero rotulo="Ainda a receber" valor={formatarPreco(previsto)} detalhe={plural(emAberto.length, "horário")} />
        </dl>
      </section>

      {porDia.some((dia) => dia.valor > 0) && <GraficoPorDia dias={porDia} periodo={periodo} hoje={hoje} />}

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="rotulo mb-3 text-cinza">Atendimentos concluídos</h2>
          {concluidos.length === 0 ? (
            <p className="rounded-2xl border border-linha p-5 text-sm text-cinza">Nenhum atendimento concluído neste período.</p>
          ) : (
            <ul className="divide-y divide-linha border-y border-linha">
              {[...concluidos].reverse().map((a) => (
                <li key={a.id} className="flex items-baseline gap-3 py-3">
                  <span className="w-12 shrink-0 text-sm text-cinza tabular-nums">{formatarDataCurta(a.data)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.nomeCliente}</span>
                    <span className="block truncate text-sm text-cinza">{a.resumo}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatarPreco(valorRecebido(a))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="rotulo mb-3 text-cinza">Serviços mais feitos</h2>
          {maisFeitos.length === 0 ? (
            <p className="text-sm text-cinza">Aparece aqui quando houver atendimentos concluídos.</p>
          ) : (
            <ol className="space-y-2.5">
              {maisFeitos.map(([nome, quantidade]) => (
                <li key={nome} className="flex items-baseline">
                  <span>{nome}</span>
                  <span className="guia text-cinza" />
                  <span className="tabular-nums text-cinza">{quantidade}×</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="px-4 py-3.5">
      <dt className="text-xs text-cinza">{rotulo}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums">{valor}</dd>
      {detalhe && <dd className="text-xs text-cinza">{detalhe}</dd>}
    </div>
  );
}

/** Barras do valor recebido por dia: uma série só, então o título faz o papel da legenda. */
function GraficoPorDia({
  dias,
  periodo,
  hoje,
}: {
  dias: { data: string; valor: number; quantidade: number }[];
  periodo: Periodo;
  hoje: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maior = Math.max(...dias.map((dia) => dia.valor), 0);
  const escala = maior > 0 ? maior : 1;
  const destaque = ativo !== null ? dias[ativo] : null;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="rotulo text-cinza">Recebido por dia</h2>
        <p className="text-sm text-cinza tabular-nums" aria-live="polite">
          {destaque
            ? `${formatarDataLonga(destaque.data)} · ${formatarPreco(destaque.valor)} · ${plural(destaque.quantidade, "atendimento")}`
            : maior > 0
              ? `Maior dia: ${formatarPreco(maior)}`
              : "Sem valores no período"}
        </p>
      </div>

      <div className="relative mt-4 h-44 border-b border-linha" onPointerLeave={() => setAtivo(null)}>
        {maior > 0 && <div className="absolute inset-x-0 top-0 border-t border-linha" aria-hidden="true" />}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {dias.map((dia, indice) => {
            const altura = (dia.valor / escala) * 100;
            return (
              <button
                key={dia.data}
                type="button"
                aria-label={`${formatarDataLonga(dia.data)}: ${formatarPreco(dia.valor)}`}
                onPointerEnter={() => setAtivo(indice)}
                onFocus={() => setAtivo(indice)}
                onBlur={() => setAtivo(null)}
                className="group flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-offset-0"
              >
                <span
                  className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${
                    ativo === indice ? "bg-giz" : dia.data === hoje ? "bg-vermelho-vivo" : "bg-vermelho-vivo/85"
                  }`}
                  style={{ height: dia.valor > 0 ? `max(${altura}%, 3px)` : "0px" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-[2px] text-center text-[11px] text-cinza tabular-nums" aria-hidden="true">
        {dias.map((dia, indice) => {
          const numero = partesDaData(dia.data).dia;
          const mostrar = periodo === "semana" || indice === 0 || numero % 5 === 0;
          return (
            <span key={dia.data} className="min-w-0 flex-1">
              {mostrar ? (periodo === "semana" ? SEMANA[diaDaSemana(dia.data)] : numero) : ""}
            </span>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>Valor recebido por dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Recebido</th>
            <th>Atendimentos</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((dia) => (
            <tr key={dia.data}>
              <td>{formatarDataLonga(dia.data)}</td>
              <td>{formatarPreco(dia.valor)}</td>
              <td>{dia.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
