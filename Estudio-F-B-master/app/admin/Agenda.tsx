"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IconeMais, IconeTesoura } from "@/components/Icones";
import { CartaoAgendamento } from "@/components/painel/CartaoAgendamento";
import { FormularioAgendamento } from "@/components/painel/FormularioAgendamento";
import { useAgendamentos } from "@/components/painel/useAgendamentos";
import type { Servico } from "@/lib/catalogo";
import { formatarDataLonga, formatarPreco } from "@/lib/formatos";
import { somarDias, type ConfiguracaoHorarios } from "@/lib/horariosAtendimento";
import { useAgora } from "@/lib/noNavegador";
import type { Agendamento } from "@/lib/tipos";

type Aba = "proximos" | "historico";

function saudacao(minutos: number) {
  if (minutos < 12 * 60) return "Bom dia";
  if (minutos < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

export function Agenda({ servicos, horarios }: { servicos: Servico[]; horarios: ConfiguracaoHorarios }) {
  const agora = useAgora();
  const hoje = agora?.data ?? "";
  const [aba, setAba] = useState<Aba>("proximos");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [formulario, setFormulario] = useState<{ inicial?: Agendamento } | null>(null);

  const de = hoje ? (aba === "proximos" ? hoje : somarDias(hoje, -30)) : "";
  const ate = hoje ? (aba === "proximos" ? somarDias(hoje, 90) : somarDias(hoje, -1)) : "";
  const { agendamentos, carregando, erro, recarregar, substituir, remover } = useAgendamentos(de, ate);

  const porDia = useMemo(() => {
    const visiveis = agendamentos.filter((a) => mostrarCancelados || a.status !== "cancelado");
    const ordenados = aba === "historico" ? [...visiveis].reverse() : visiveis;
    const grupos: { data: string; itens: Agendamento[] }[] = [];
    for (const agendamento of ordenados) {
      const grupo = grupos.find((item) => item.data === agendamento.data);
      if (grupo) grupo.itens.push(agendamento);
      else grupos.push({ data: agendamento.data, itens: [agendamento] });
    }
    // No histórico os dias vêm do mais recente para o mais antigo, mas os horários seguem a ordem do dia.
    if (aba === "historico") for (const grupo of grupos) grupo.itens.reverse();
    return grupos;
  }, [agendamentos, aba, mostrarCancelados]);

  const deHoje = agendamentos.filter((a) => a.data === hoje && a.status !== "cancelado");
  const aConfirmar = agendamentos.filter((a) => a.status === "pendente").length;
  const previstoHoje = deHoje.reduce((soma, a) => soma + (a.valorCobrado ?? a.valor), 0);
  const cancelados = agendamentos.filter((a) => a.status === "cancelado").length;

  function tituloDoDia(data: string) {
    const longa = formatarDataLonga(data);
    if (data === hoje) return `Hoje · ${longa}`;
    if (hoje && data === somarDias(hoje, 1)) return `Amanhã · ${longa}`;
    if (hoje && data === somarDias(hoje, -1)) return `Ontem · ${longa}`;
    return longa;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-cinza">{agora ? saudacao(agora.minutos) : " "}</p>
          <h1 className="font-display text-[2.4rem] font-medium leading-tight">{hoje ? formatarDataLonga(hoje) : "Agenda"}</h1>
        </div>
        <button type="button" onClick={() => setFormulario({})} className="botao-vermelho h-12">
          <IconeMais /> Novo horário
        </button>
      </div>

      {aba === "proximos" && !carregando && (
        <dl className="mt-6 grid grid-cols-3 divide-x divide-linha rounded-2xl border border-linha">
          <Numero rotulo="Hoje" valor={String(deHoje.length)} />
          <Numero rotulo="A confirmar" valor={String(aConfirmar)} destaque={aConfirmar > 0} />
          <Numero rotulo="Previsto hoje" valor={formatarPreco(previstoHoje)} />
        </dl>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex rounded-full border border-linha p-1">
          {(
            [
              ["proximos", "Próximos"],
              ["historico", "Últimos 30 dias"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={aba === valor}
              onClick={() => setAba(valor)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${aba === valor ? "bg-giz font-medium text-white" : "text-cinza hover:text-giz"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {cancelados > 0 && (
          <label className="flex items-center gap-2 text-sm text-cinza">
            <input
              type="checkbox"
              checked={mostrarCancelados}
              onChange={(evento) => setMostrarCancelados(evento.target.checked)}
              className="h-4 w-4 accent-[#c8102e]"
            />
            Mostrar cancelados ({cancelados})
          </label>
        )}
      </div>

      {erro && (
        <p role="alert" className="mt-6 border-l-2 border-vermelho-vivo pl-3 text-sm">
          {erro}{" "}
          <button type="button" onClick={recarregar} className="font-medium text-vermelho-vivo underline">
            Tentar de novo
          </button>
        </p>
      )}

      <div className="mt-6 space-y-10 pb-6">
        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-carvao" />
            ))}
          </div>
        ) : porDia.length === 0 ? (
          <div className="rounded-2xl border border-linha px-6 py-12 text-center">
            <IconeTesoura className="mx-auto h-8 w-8 text-cinza" />
            <p className="mt-4 font-medium">{aba === "proximos" ? "Nenhum horário marcado por enquanto" : "Nenhum atendimento nos últimos 30 dias"}</p>
            <p className="mt-1 text-sm text-cinza">
              {aba === "proximos" ? "As reservas feitas pelo site aparecem aqui sozinhas." : "Os atendimentos concluídos ficam aqui e no financeiro."}
            </p>
          </div>
        ) : (
          porDia.map((grupo) => (
            <section key={grupo.data}>
              <h2 className={`rotulo mb-3 ${grupo.data === hoje ? "text-vermelho-vivo" : "text-cinza"}`}>{tituloDoDia(grupo.data)}</h2>
              <div className="space-y-3">
                {grupo.itens.map((agendamento) => (
                  <CartaoAgendamento
                    key={agendamento.id}
                    agendamento={agendamento}
                    hoje={hoje}
                    onAtualizado={substituir}
                    onRemovido={remover}
                    onEditar={(item) => setFormulario({ inicial: item })}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <AnimatePresence>
        {formulario && (
          <FormularioAgendamento
            servicos={servicos}
            horarios={horarios}
            inicial={formulario.inicial}
            dataInicial={hoje}
            onFechar={() => setFormulario(null)}
            onSalvo={() => {
              setFormulario(null);
              recarregar();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Numero({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="px-4 py-3.5">
      <dt className="text-xs text-cinza">{rotulo}</dt>
      <dd className={`mt-1 truncate text-lg font-semibold tabular-nums ${destaque ? "text-vermelho-vivo" : ""}`}>{valor}</dd>
    </div>
  );
}
