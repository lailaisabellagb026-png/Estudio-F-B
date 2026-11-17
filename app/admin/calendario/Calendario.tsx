"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IconeMais, IconeSeta } from "@/components/Icones";
import { CartaoAgendamento } from "@/components/painel/CartaoAgendamento";
import { FormularioAgendamento } from "@/components/painel/FormularioAgendamento";
import { useAgendamentos } from "@/components/painel/useAgendamentos";
import type { Servico } from "@/lib/catalogo";
import { formatarDataLonga, formatarPreco, plural } from "@/lib/formatos";
import { dataEstaAberta, diaDaSemana, somarDias, type ConfiguracaoHorarios } from "@/lib/horariosAtendimento";
import { useAgora } from "@/lib/noNavegador";
import type { Agendamento } from "@/lib/tipos";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** As 6 semanas exibidas para um mês (AAAA-MM), começando no domingo. */
function gradeDoMes(mes: string) {
  const primeiro = `${mes}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

function mudarMes(mes: string, delta: number) {
  const [ano, numero] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, numero - 1 + delta, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function Calendario({ servicos, horarios }: { servicos: Servico[]; horarios: ConfiguracaoHorarios }) {
  const agora = useAgora();
  const hoje = agora?.data ?? "";
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<{ inicial?: Agendamento; data: string } | null>(null);

  const mes = mesEscolhido ?? hoje.slice(0, 7);
  const dia = diaEscolhido ?? hoje;
  const grade = useMemo(() => (mes ? gradeDoMes(mes) : []), [mes]);
  const { agendamentos, carregando, substituir, remover, recarregar } = useAgendamentos(grade[0] ?? "", grade[41] ?? "");

  const porDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const agendamento of agendamentos) {
      mapa.set(agendamento.data, [...(mapa.get(agendamento.data) ?? []), agendamento]);
    }
    return mapa;
  }, [agendamentos]);

  const doDia = porDia.get(dia) ?? [];
  const ativosDoDia = doDia.filter((a) => a.status !== "cancelado");
  const [ano, numeroMes] = mes ? mes.split("-").map(Number) : [0, 0];

  return (
    <main className="mx-auto max-w-5xl px-5 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMesEscolhido(mudarMes(mes, -1))}
            aria-label="Mês anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-linha text-cinza hover:text-giz"
          >
            <IconeSeta direcao="esquerda" />
          </button>
          <h1 className="min-w-[11ch] text-center font-display text-[2rem] font-medium">
            {mes ? MESES[numeroMes - 1] : ""} <span className="text-cinza">{ano || ""}</span>
          </h1>
          <button
            type="button"
            onClick={() => setMesEscolhido(mudarMes(mes, 1))}
            aria-label="Próximo mês"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-linha text-cinza hover:text-giz"
          >
            <IconeSeta />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMesEscolhido(null);
            setDiaEscolhido(null);
          }}
          className="botao-contorno min-h-10 px-4 text-sm"
        >
          Hoje
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="grid grid-cols-7 text-center">
            {DIAS.map((nome) => (
              <span key={nome} className="rotulo pb-2 text-cinza">
                {nome}
              </span>
            ))}
          </div>
          <div className={`grid grid-cols-7 gap-1 ${carregando ? "opacity-60" : ""}`}>
            {grade.map((data) => {
              const doMes = data.slice(0, 7) === mes;
              const ativos = (porDia.get(data) ?? []).filter((a) => a.status !== "cancelado");
              const aConfirmar = ativos.some((a) => a.status === "pendente");
              const aberto = dataEstaAberta(data, horarios);
              const escolhido = data === dia;
              return (
                <button
                  key={data}
                  type="button"
                  onClick={() => {
                    setDiaEscolhido(data);
                    if (!doMes) setMesEscolhido(data.slice(0, 7));
                  }}
                  aria-pressed={escolhido}
                  aria-label={`${formatarDataLonga(data)}: ${plural(ativos.length, "horário")}`}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-[10px] border text-sm transition-colors sm:aspect-[1/0.9] ${
                    escolhido
                      ? "border-vermelho bg-vermelho text-white"
                      : data === hoje
                        ? "border-giz/60"
                        : "border-transparent hover:border-linha"
                  } ${!doMes ? "opacity-30" : ""} ${!aberto && !escolhido ? "text-cinza/60" : ""}`}
                >
                  <span className="tabular-nums">{Number(data.slice(8))}</span>
                  {ativos.length > 0 && (
                    <span className={`mt-0.5 text-[11px] font-bold tabular-nums ${escolhido ? "text-white" : aConfirmar ? "text-vermelho-vivo" : "text-giz/80"}`}>
                      {ativos.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-cinza">
            O número em cada dia é a quantidade de horários. Em <span className="text-vermelho-vivo">vermelho</span>, há reservas a confirmar.
          </p>
        </div>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{dia ? formatarDataLonga(dia) : ""}</h2>
              <p className="text-sm text-cinza">
                {ativosDoDia.length === 0
                  ? dia && !dataEstaAberta(dia, horarios)
                    ? "Estúdio fechado"
                    : "Dia livre"
                  : `${plural(ativosDoDia.length, "horário")} · ${formatarPreco(ativosDoDia.reduce((s, a) => s + (a.valorCobrado ?? a.valor), 0))}`}
              </p>
            </div>
            <button type="button" onClick={() => setFormulario({ data: dia })} className="botao-vermelho min-h-10 px-4 text-sm">
              <IconeMais /> Novo
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {doDia.map((agendamento) => (
              <CartaoAgendamento
                key={agendamento.id}
                agendamento={agendamento}
                hoje={hoje}
                onAtualizado={substituir}
                onRemovido={remover}
                onEditar={(item) => setFormulario({ inicial: item, data: item.data })}
              />
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {formulario && (
          <FormularioAgendamento
            servicos={servicos}
            horarios={horarios}
            inicial={formulario.inicial}
            dataInicial={formulario.data}
            onFechar={() => setFormulario(null)}
            onSalvo={(agendamento) => {
              setFormulario(null);
              setDiaEscolhido(agendamento.data);
              setMesEscolhido(agendamento.data.slice(0, 7));
              recarregar();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
