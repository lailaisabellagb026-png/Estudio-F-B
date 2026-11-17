"use client";

import { useState } from "react";
import { IconeWhatsApp } from "@/components/Icones";
import { formatarPreco, formatarTelefone, lerPreco, linkWhatsApp } from "@/lib/formatos";
import { linkConfirmarComCliente, linkLembrarCliente } from "@/lib/mensagens";
import { NOMES_STATUS, type Agendamento, type StatusAgendamento } from "@/lib/tipos";
import { chamarApi } from "./api";

const ESTILO_SELO: Record<StatusAgendamento, string> = {
  pendente: "border border-vermelho-vivo text-vermelho-vivo",
  confirmado: "bg-giz text-white",
  concluido: "bg-carvao-2 text-cinza",
  cancelado: "border border-linha text-cinza",
};

export function SeloStatus({ status }: { status: StatusAgendamento }) {
  return (
    <span className={`rotulo inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] ${ESTILO_SELO[status]}`}>
      {NOMES_STATUS[status]}
    </span>
  );
}

type Painel = "nenhum" | "concluir" | "mais" | "excluir";

export function CartaoAgendamento({
  agendamento: a,
  hoje,
  onAtualizado,
  onRemovido,
  onEditar,
}: {
  agendamento: Agendamento;
  hoje: string;
  onAtualizado: (agendamento: Agendamento) => void;
  onRemovido: (id: string) => void;
  onEditar: (agendamento: Agendamento) => void;
}) {
  const [painel, setPainel] = useState<Painel>("nenhum");
  const [valor, setValor] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const ativo = a.status === "pendente" || a.status === "confirmado";
  const cancelado = a.status === "cancelado";

  async function enviar(corpo: Record<string, unknown>) {
    setOcupado(true);
    setErro("");
    try {
      const { agendamento } = await chamarApi<{ agendamento: Agendamento }>(`/api/admin/agendamentos/${a.id}`, {
        metodo: "PATCH",
        corpo,
      });
      onAtualizado(agendamento);
      setPainel("nenhum");
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    setOcupado(true);
    setErro("");
    try {
      await chamarApi(`/api/admin/agendamentos/${a.id}`, { metodo: "DELETE" });
      onRemovido(a.id);
    } catch (falha) {
      setErro((falha as Error).message);
      setOcupado(false);
    }
  }

  function abrirConcluir() {
    setValor(String(a.valorCobrado ?? a.valor).replace(".", ","));
    setErro("");
    setPainel("concluir");
  }

  function concluir() {
    const numero = lerPreco(valor);
    if (!Number.isFinite(numero)) {
      setErro("Digite o valor cobrado, por exemplo 150 ou 150,00.");
      return;
    }
    enviar({ acao: "concluir", valorCobrado: numero });
  }

  const linkCliente =
    a.status === "pendente"
      ? linkConfirmarComCliente(a)
      : a.status === "confirmado" && a.data >= hoje
        ? linkLembrarCliente(a)
        : linkWhatsApp(a.telefone);

  return (
    <article className={`rounded-2xl border bg-carvao ${a.status === "pendente" ? "border-vermelho-vivo/40" : "border-linha"} ${cancelado ? "opacity-60" : ""}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-2xl leading-none tabular-nums">
            {a.hora}
            <span className="ml-2 font-sans text-sm text-cinza">até {a.fim}</span>
          </p>
          <SeloStatus status={a.status} />
        </div>

        <h3 className={`mt-3 text-[17px] font-semibold ${cancelado ? "line-through" : ""}`}>{a.nomeCliente}</h3>
        <p className="mt-0.5 text-[15px] text-giz/85">{a.resumo}</p>
        <p className="mt-1 text-sm text-cinza tabular-nums">
          {formatarTelefone(a.telefone)} ·{" "}
          {a.status === "concluido" && a.valorCobrado !== null ? (
            <span className="text-giz">{formatarPreco(a.valorCobrado)} cobrado</span>
          ) : (
            <>
              {a.aPartirDe && "a partir de "}
              {formatarPreco(a.valor)}
            </>
          )}
          {a.origem === "estudio" && " · marcado pelo estúdio"}
        </p>
        {a.observacao && <p className="mt-2 border-l-2 border-linha pl-3 text-sm italic text-giz/80">{a.observacao}</p>}
      </div>

      {painel === "concluir" ? (
        <div className="border-t border-linha p-4">
          <label className="block">
            <span className="rotulo mb-2 block text-cinza">Valor cobrado</span>
            <input
              className="campo tabular-nums"
              inputMode="decimal"
              autoFocus
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              onKeyDown={(evento) => evento.key === "Enter" && concluir()}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={concluir} disabled={ocupado} className="botao-vermelho">
              {ocupado ? "Salvando…" : "Concluir atendimento"}
            </button>
            <button type="button" onClick={() => setPainel("nenhum")} className="botao-contorno">
              Voltar
            </button>
          </div>
        </div>
      ) : painel === "excluir" ? (
        <div className="border-t border-linha p-4">
          <p className="text-sm">Apagar este registro de vez? Ele some da agenda e do financeiro.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={excluir} disabled={ocupado} className="botao-vermelho">
              {ocupado ? "Apagando…" : "Apagar registro"}
            </button>
            <button type="button" onClick={() => setPainel("mais")} className="botao-contorno">
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-linha px-4 py-3">
          <a
            href={linkCliente}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir conversa com ${a.nomeCliente} no WhatsApp`}
            className="botao-contorno min-h-10 px-3 text-sm"
          >
            <IconeWhatsApp className="h-4 w-4" />
            {a.status === "pendente" ? "Confirmar no WhatsApp" : "WhatsApp"}
          </a>
          {a.status === "pendente" && (
            <button type="button" onClick={() => enviar({ acao: "confirmar" })} disabled={ocupado} className="botao-claro min-h-10 px-3 text-sm">
              Marcar confirmado
            </button>
          )}
          {ativo && a.data <= hoje && (
            <button type="button" onClick={abrirConcluir} disabled={ocupado} className="botao-vermelho min-h-10 px-3 text-sm">
              Concluir
            </button>
          )}
          {a.status === "concluido" && (
            <button type="button" onClick={abrirConcluir} disabled={ocupado} className="botao-contorno min-h-10 px-3 text-sm">
              Ajustar valor
            </button>
          )}
          <button
            type="button"
            onClick={() => setPainel(painel === "mais" ? "nenhum" : "mais")}
            aria-expanded={painel === "mais"}
            className="ml-auto min-h-10 px-2 text-sm font-medium text-cinza hover:text-giz"
          >
            {painel === "mais" ? "Fechar" : "Mais"}
          </button>

          {painel === "mais" && (
            <div className="flex w-full flex-wrap gap-2 pt-1">
              {!cancelado && (
                <button
                  type="button"
                  onClick={() => {
                    setPainel("nenhum");
                    onEditar(a);
                  }}
                  className="botao-contorno min-h-10 px-3 text-sm"
                >
                  Editar
                </button>
              )}
              {ativo && (
                <button type="button" onClick={() => enviar({ acao: "cancelar" })} disabled={ocupado} className="botao-contorno min-h-10 px-3 text-sm">
                  Cancelar horário
                </button>
              )}
              {(cancelado || a.status === "concluido") && (
                <button type="button" onClick={() => enviar({ acao: "reabrir" })} disabled={ocupado} className="botao-contorno min-h-10 px-3 text-sm">
                  Reabrir
                </button>
              )}
              <button
                type="button"
                onClick={() => setPainel("excluir")}
                className="min-h-10 px-3 text-sm font-medium text-vermelho-vivo hover:underline"
              >
                Apagar registro
              </button>
            </div>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="border-t border-linha px-4 py-3 text-sm text-vermelho-vivo">
          {erro}
        </p>
      )}
    </article>
  );
}
