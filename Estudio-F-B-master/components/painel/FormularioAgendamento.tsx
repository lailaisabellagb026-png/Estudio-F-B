"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { IconeCheck, IconeFechar } from "@/components/Icones";
import { useDisponibilidade } from "@/components/useDisponibilidade";
import { horariosLivres } from "@/lib/agenda";
import { agruparPorCategoria, type Servico } from "@/lib/catalogo";
import { formatarDataLonga, formatarDuracao, formatarPreco, formatarPrecoCurto, formatarTelefone, telefoneValido } from "@/lib/formatos";
import { dataValida, horaParaMinutos, minutosParaHora, obterExpediente, type ConfiguracaoHorarios } from "@/lib/horariosAtendimento";
import type { Agendamento } from "@/lib/tipos";
import { chamarApi } from "./api";

/** Folha para o estúdio marcar um horário novo ou editar um existente. */
export function FormularioAgendamento({
  servicos,
  horarios,
  inicial,
  dataInicial,
  onFechar,
  onSalvo,
}: {
  servicos: Servico[];
  horarios: ConfiguracaoHorarios;
  inicial?: Agendamento;
  dataInicial: string;
  onFechar: () => void;
  onSalvo: (agendamento: Agendamento) => void;
}) {
  const [nome, setNome] = useState(inicial?.nomeCliente ?? "");
  const [telefone, setTelefone] = useState(inicial ? formatarTelefone(inicial.telefone) : "");
  const [data, setData] = useState(inicial?.data ?? dataInicial);
  const [selecionados, setSelecionados] = useState<string[]>(inicial?.servicos.map((servico) => servico.id) ?? []);
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Serviços que saíram do catálogo continuam disponíveis na edição.
  const opcoes = useMemo<Servico[]>(() => {
    const extras = (inicial?.servicos ?? [])
      .filter((servico) => !servicos.some((item) => item.id === servico.id))
      .map((servico) => ({ ...servico, ativo: false }));
    return [...servicos, ...extras];
  }, [servicos, inicial]);
  const grupos = useMemo(() => agruparPorCategoria(opcoes), [opcoes]);
  const escolhidos = opcoes.filter((servico) => selecionados.includes(servico.id));
  const duracao = escolhidos.reduce((total, servico) => total + servico.duracaoMin, 0);
  const total = escolhidos.reduce((soma, servico) => soma + servico.preco, 0);

  const dataOk = dataValida(data);
  const expediente = dataOk ? obterExpediente(data, horarios) : null;
  const disponibilidade = useDisponibilidade(dataOk ? data : "", true);

  const ocupados = useMemo(() => {
    const lista = disponibilidade.ocupados;
    if (!lista || !inicial || inicial.data !== data || inicial.status === "cancelado") return lista;
    // O próprio horário em edição não conta como ocupado.
    const indice = lista.findIndex((item) => item.inicio === inicial.hora && item.fim === inicial.fim);
    return indice < 0 ? lista : lista.filter((_, posicao) => posicao !== indice);
  }, [disponibilidade.ocupados, inicial, data]);

  const livres = useMemo(
    () => (dataOk && ocupados && duracao > 0 ? horariosLivres({ data, duracaoMin: duracao, configuracao: horarios, ocupados }) : []),
    [data, dataOk, duracao, horarios, ocupados],
  );
  const horaEscolhida = livres.includes(hora) ? hora : "";

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = rolagemAnterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [onFechar]);

  function alternar(id: string) {
    setSelecionados((atuais) => (atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]));
    setErro("");
  }

  async function salvar() {
    const problema =
      nome.trim().length < 2
        ? "Informe o nome da cliente."
        : !telefoneValido(telefone)
          ? "Informe o WhatsApp com DDD."
          : !dataOk
            ? "Escolha o dia."
            : escolhidos.length === 0
              ? "Escolha pelo menos um serviço."
              : !horaEscolhida
                ? "Escolha um horário livre."
                : "";
    if (problema) {
      setErro(problema);
      return;
    }

    setSalvando(true);
    setErro("");
    const dados = { nomeCliente: nome, telefone, data, hora: horaEscolhida, servicoIds: selecionados, observacao };
    try {
      const { agendamento } = inicial
        ? await chamarApi<{ agendamento: Agendamento }>(`/api/admin/agendamentos/${inicial.id}`, {
            metodo: "PATCH",
            corpo: { acao: "editar", dados },
          })
        : await chamarApi<{ agendamento: Agendamento }>("/api/admin/agendamentos", { metodo: "POST", corpo: dados });
      onSalvo(agendamento);
    } catch (falha) {
      setErro((falha as Error).message);
      disponibilidade.recarregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 md:items-center md:p-6"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-formulario"
        initial={{ y: 48 }}
        animate={{ y: 0 }}
        exit={{ y: 48 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-linha bg-tinta md:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-linha px-5 py-4">
          <h2 id="titulo-formulario" className="font-display text-2xl">
            {inicial ? "Editar horário" : "Novo horário"}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-mr-2 p-2 text-cinza hover:text-giz">
            <IconeFechar className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
          <Secao titulo="Cliente">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="campo"
                placeholder="Nome"
                autoComplete="off"
                maxLength={60}
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
              />
              <input
                className="campo tabular-nums"
                type="tel"
                inputMode="tel"
                placeholder="WhatsApp com DDD"
                value={telefone}
                onChange={(evento) => setTelefone(formatarTelefone(evento.target.value))}
              />
            </div>
          </Secao>

          <Secao titulo="Dia">
            <input
              type="date"
              className="campo tabular-nums"
              value={data}
              onChange={(evento) => {
                setData(evento.target.value);
                setErro("");
              }}
            />
            {dataOk && (
              <p className="mt-2 text-sm text-cinza">
                {formatarDataLonga(data)} ·{" "}
                {expediente?.ativo ? (
                  <>
                    aberto das {expediente.inicio} às {expediente.fim}
                  </>
                ) : (
                  <span className="text-vermelho-vivo">fechado (abra um horário especial em Serviços)</span>
                )}
              </p>
            )}
          </Secao>

          <Secao titulo="Serviços">
            <div className="space-y-5">
              {grupos.map((grupo) => (
                <div key={grupo.categoria}>
                  <p className="mb-1 font-display text-lg italic text-cinza">{grupo.categoria}</p>
                  <ul>
                    {grupo.servicos.map((servico) => {
                      const marcado = selecionados.includes(servico.id);
                      return (
                        <li key={servico.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={marcado}
                            onClick={() => alternar(servico.id)}
                            className="flex w-full items-center gap-3 py-2.5 text-left"
                          >
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${marcado ? "border-vermelho bg-vermelho text-white" : "border-cinza/40"}`}
                            >
                              {marcado && <IconeCheck className="h-3.5 w-3.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              {servico.nome}
                              {!servico.ativo && <span className="ml-2 text-xs text-cinza">(oculto no site)</span>}
                            </span>
                            <span className="shrink-0 text-sm text-cinza tabular-nums">
                              {formatarDuracao(servico.duracaoMin)} · {formatarPrecoCurto(servico.preco)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Horário">
            {!dataOk || escolhidos.length === 0 ? (
              <p className="text-sm text-cinza">Escolha o dia e os serviços para ver os horários livres.</p>
            ) : disponibilidade.carregando ? (
              <p className="text-sm text-cinza">Conferindo a agenda…</p>
            ) : disponibilidade.falhou ? (
              <button type="button" onClick={disponibilidade.recarregar} className="text-sm font-medium text-vermelho-vivo underline">
                Não foi possível ver a agenda. Tentar de novo
              </button>
            ) : livres.length === 0 ? (
              <p className="text-sm text-cinza">Nenhum horário livre para {formatarDuracao(duracao)} neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {livres.map((horario) => {
                  const marcado = horaEscolhida === horario;
                  return (
                    <button
                      key={horario}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => {
                        setHora(horario);
                        setErro("");
                      }}
                      className={`rounded-[10px] border py-2.5 text-center tabular-nums transition-colors ${
                        marcado ? "border-vermelho bg-vermelho text-white" : "border-linha bg-carvao hover:border-giz/40"
                      }`}
                    >
                      <span className="block font-semibold">{horario}</span>
                      <span className={`block text-[10px] ${marcado ? "text-white/80" : "text-cinza"}`}>
                        até {minutosParaHora(horaParaMinutos(horario) + duracao)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Secao>

          <Secao titulo="Recado (opcional)">
            <textarea
              className="campo min-h-[72px] resize-none"
              maxLength={280}
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
            />
          </Secao>
        </div>

        <footer className="border-t border-linha px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {erro && (
            <p role="alert" className="mb-3 border-l-2 border-vermelho-vivo pl-3 text-sm font-medium">
              {erro}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-cinza tabular-nums">
              {escolhidos.length > 0 ? `${formatarDuracao(duracao)} · ${formatarPreco(total)}` : "Nenhum serviço escolhido"}
            </p>
            <button type="button" onClick={salvar} disabled={salvando} className="botao-vermelho h-12 px-6">
              {salvando ? "Salvando…" : inicial ? "Salvar alterações" : "Marcar horário"}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <p className="rotulo mb-3 text-cinza">{titulo}</p>
      {children}
    </section>
  );
}
