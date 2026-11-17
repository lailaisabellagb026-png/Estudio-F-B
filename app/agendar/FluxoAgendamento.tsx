"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { Comanda } from "@/components/Comanda";
import { IconeCheck, IconeFechar, IconeSeta, IconeTesoura, IconeWhatsApp } from "@/components/Icones";
import { MarcaFB } from "@/components/MarcaFB";
import { useDisponibilidade } from "@/components/useDisponibilidade";
import { datasParaAgendar, horariosLivres, inicioPermitido } from "@/lib/agenda";
import { agruparPorCategoria, type Categoria, type Servico } from "@/lib/catalogo";
import { ESTUDIO } from "@/lib/estudio";
import {
  formatarDataCurta,
  formatarDataLonga,
  formatarDuracao,
  formatarPreco,
  formatarPrecoCurto,
  formatarTelefone,
  linkWhatsApp,
  partesDaData,
  plural,
  somenteDigitos,
  telefoneValido,
} from "@/lib/formatos";
import {
  horaParaMinutos,
  minutosParaHora,
  obterExpediente,
  resumoDiasAbertos,
  somarDias,
  type ConfiguracaoHorarios,
} from "@/lib/horariosAtendimento";
import { lembrarCliente, useAgora, useClienteSalva } from "@/lib/noNavegador";
import type { AgendamentoDaCliente } from "@/lib/tipos";

const ETAPAS = ["Você e o dia", "Serviços", "Horário"];
const ROTULO_AVANCAR = ["Escolher serviços", "Ver horários livres", "Reservar horário"];
const DATAS_POR_PAGINA = 6;

const transicaoEtapa: Variants = {
  entrar: (direcao: number) => ({ opacity: 0, x: 36 * direcao }),
  centro: { opacity: 1, x: 0 },
  sair: (direcao: number) => ({ opacity: 0, x: -36 * direcao }),
};

export function FluxoAgendamento({ servicos, horarios }: { servicos: Servico[]; horarios: ConfiguracaoHorarios }) {
  const agora = useAgora();
  const clienteSalva = useClienteSalva();

  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [nomeDigitado, setNomeDigitado] = useState<string | null>(null);
  const [telefoneDigitado, setTelefoneDigitado] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [observacao, setObservacao] = useState("");
  const [armadilha, setArmadilha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [reservado, setReservado] = useState<{ agendamento: AgendamentoDaCliente; nome: string; telefone: string } | null>(null);

  // Quem já agendou neste aparelho encontra nome e WhatsApp preenchidos.
  const nome = nomeDigitado ?? clienteSalva?.nome ?? "";
  const telefone = telefoneDigitado ?? (clienteSalva ? formatarTelefone(clienteSalva.telefone) : "");

  // ── Dia ──
  const datas = useMemo(() => (agora ? datasParaAgendar(horarios, agora) : null), [agora, horarios]);
  const dataValida = Boolean(data) && Boolean(datas?.includes(data));
  const expediente = dataValida ? obterExpediente(data, horarios) : null;

  // ── Serviços ──
  const grupos = useMemo(() => agruparPorCategoria(servicos), [servicos]);
  const categoriaAtual = grupos.some((grupo) => grupo.categoria === categoria) ? categoria : grupos[0]?.categoria ?? "";
  const escolhidos = useMemo(() => servicos.filter((servico) => selecionados.includes(servico.id)), [servicos, selecionados]);
  const duracao = escolhidos.reduce((total, servico) => total + servico.duracaoMin, 0);
  const total = escolhidos.reduce((soma, servico) => soma + servico.preco, 0);
  const aPartirDe = escolhidos.some((servico) => servico.aPartirDe);

  // ── Horário ──
  const disponibilidade = useDisponibilidade(dataValida ? data : "", etapa === 2);
  const livres = useMemo(() => {
    if (!dataValida || !agora || !disponibilidade.ocupados || duracao === 0) return [];
    return horariosLivres({
      data,
      duracaoMin: duracao,
      configuracao: horarios,
      ocupados: disponibilidade.ocupados,
      aPartirDeMin: inicioPermitido(data, agora),
    });
  }, [agora, data, dataValida, disponibilidade.ocupados, duracao, horarios]);
  const horaEscolhida = livres.includes(hora) ? hora : "";
  const horaPerdida = Boolean(hora) && !horaEscolhida && !disponibilidade.carregando;

  function problemaNaEtapa(indice: number) {
    if (indice === 0) {
      if (nome.trim().length < 2) return "Digite seu nome.";
      if (!telefoneValido(telefone)) return "Digite seu WhatsApp com DDD.";
      if (!dataValida) return "Escolha um dia.";
    }
    if (indice === 1 && escolhidos.length === 0) return "Escolha pelo menos um serviço.";
    if (indice === 2 && !horaEscolhida) return "Escolha um horário.";
    return "";
  }

  function podeIrPara(indice: number) {
    return indice <= etapa || ETAPAS.slice(0, indice).every((_, anterior) => !problemaNaEtapa(anterior));
  }

  function irPara(indice: number) {
    setDirecao(indice >= etapa ? 1 : -1);
    setEtapa(indice);
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function avancar() {
    const problema = problemaNaEtapa(etapa);
    if (problema) {
      setErro(problema);
      return;
    }
    if (etapa < ETAPAS.length - 1) irPara(etapa + 1);
    else reservar();
  }

  function alternarServico(id: string) {
    setSelecionados((atuais) => (atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]));
    // A duração mudou: o horário escolhido precisa ser revisto.
    setHora("");
    setErro("");
  }

  async function reservar() {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: nome,
          telefone,
          data,
          hora: horaEscolhida,
          servicoIds: escolhidos.map((servico) => servico.id),
          observacao,
          site: armadilha,
        }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Não foi possível reservar. Tente de novo.");
        if (resposta.status === 409) {
          setHora("");
          disponibilidade.recarregar();
        }
        return;
      }
      lembrarCliente({ nome: nome.trim(), telefone: somenteDigitos(telefone) });
      setReservado({ agendamento: corpo.agendamento, nome: nome.trim(), telefone });
      setData("");
      setSelecionados([]);
      setHora("");
      setObservacao("");
      setEtapa(0);
      window.scrollTo({ top: 0 });
    } catch {
      setErro("Sem conexão com a internet. Confira e tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-linha bg-tinta/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-xl items-center gap-3 px-5">
            <Link
              href="/"
              aria-label="Voltar para a página inicial"
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-cinza transition-colors hover:text-giz"
            >
              <IconeSeta direcao="esquerda" className="h-5 w-5" />
            </Link>
            <p className="flex-1 font-display text-xl">{reservado ? "Horário reservado" : "Agendar horário"}</p>
            <MarcaFB />
          </div>
        </header>

        <main className="mx-auto max-w-xl px-5 pb-56 pt-6">
          {reservado ? (
            <HorarioReservado
              {...reservado}
              onAgendarOutro={() => {
                setReservado(null);
                setDirecao(1);
              }}
            />
          ) : (
            <>
              <IndicadorEtapas etapa={etapa} podeIrPara={podeIrPara} onIrPara={irPara} />

              <AnimatePresence mode="wait" custom={direcao} initial={false}>
                <motion.section
                  key={etapa}
                  custom={direcao}
                  variants={transicaoEtapa}
                  initial="entrar"
                  animate="centro"
                  exit="sair"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {etapa === 0 && (
                    <div className="space-y-8">
                      <TituloEtapa titulo="Quem vem e quando" texto="Seu nome e WhatsApp ficam só com o estúdio, para confirmar o horário." />

                      <div className="space-y-4">
                        <Campo rotulo="Seu nome">
                          <input
                            className="campo"
                            autoComplete="name"
                            placeholder="Como podemos te chamar?"
                            maxLength={60}
                            value={nome}
                            onChange={(evento) => {
                              setNomeDigitado(evento.target.value);
                              setErro("");
                            }}
                          />
                        </Campo>
                        <Campo rotulo="WhatsApp com DDD">
                          <input
                            className="campo tabular-nums"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
                            placeholder="(11) 99999-9999"
                            value={telefone}
                            onChange={(evento) => {
                              setTelefoneDigitado(formatarTelefone(evento.target.value));
                              setErro("");
                            }}
                          />
                        </Campo>
                        {/* Campo escondido: só robôs de spam preenchem. */}
                        <input
                          type="text"
                          name="site"
                          tabIndex={-1}
                          autoComplete="off"
                          aria-hidden="true"
                          className="hidden"
                          value={armadilha}
                          onChange={(evento) => setArmadilha(evento.target.value)}
                        />
                      </div>

                      <div>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                          <p className="rotulo text-cinza">Dia</p>
                          {resumoDiasAbertos(horarios) && <p className="text-xs text-cinza">Abre {resumoDiasAbertos(horarios).toLocaleLowerCase("pt-BR")}</p>}
                        </div>
                        {datas ? (
                          <EscolhaDeDia
                            datas={datas}
                            hoje={agora?.data ?? ""}
                            selecionada={data}
                            onEscolher={(valor) => {
                              setData(valor);
                              setHora("");
                              setErro("");
                            }}
                          />
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: DATAS_POR_PAGINA }, (_, i) => (
                              <div key={i} className="h-[92px] animate-pulse rounded-[10px] bg-carvao" />
                            ))}
                          </div>
                        )}
                        {expediente && (
                          <p className="mt-4 text-sm text-cinza">
                            <span className="text-giz">{formatarDataLonga(data)}</span> · atendimento das {expediente.inicio} às{" "}
                            {expediente.fim}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {etapa === 1 && (
                    <div className="space-y-6">
                      <TituloEtapa titulo="O que vamos fazer" texto="Marque um ou mais serviços. A duração soma sozinha." />

                      {grupos.length === 0 ? (
                        <Aviso>
                          Nenhum serviço disponível no site agora. Fale com o estúdio pelo{" "}
                          <a className="text-vermelho-vivo underline" href={linkWhatsApp(ESTUDIO.whatsapp)}>WhatsApp</a>.
                        </Aviso>
                      ) : (
                        <>
                          <div role="tablist" aria-label="Categorias" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {grupos.map((grupo) => {
                              const ativa = grupo.categoria === categoriaAtual;
                              const marcados = grupo.servicos.filter((servico) => selecionados.includes(servico.id)).length;
                              return (
                                <button
                                  key={grupo.categoria}
                                  type="button"
                                  role="tab"
                                  aria-selected={ativa}
                                  onClick={() => setCategoria(grupo.categoria)}
                                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                                    ativa ? "border-giz bg-giz text-white" : "border-linha text-cinza hover:border-giz/40 hover:text-giz"
                                  }`}
                                >
                                  {grupo.categoria}
                                  {marcados > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-vermelho px-1.5 text-[11px] font-bold text-white">
                                      {marcados}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <ul className="border-t border-linha">
                            {grupos
                              .find((grupo) => grupo.categoria === categoriaAtual)
                              ?.servicos.map((servico) => {
                                const marcado = selecionados.includes(servico.id);
                                return (
                                  <li key={servico.id} className="border-b border-linha">
                                    <button
                                      type="button"
                                      role="checkbox"
                                      aria-checked={marcado}
                                      onClick={() => alternarServico(servico.id)}
                                      className={`flex w-full items-center gap-4 px-1 py-4 text-left transition-colors ${marcado ? "bg-vermelho/[0.05]" : "hover:bg-giz/[0.03]"}`}
                                    >
                                      <Caixa marcada={marcado} />
                                      <span className="min-w-0 flex-1">
                                        <span className={`block text-[16px] font-medium ${marcado ? "text-giz" : "text-giz/90"}`}>{servico.nome}</span>
                                        <span className="block text-sm text-cinza">{formatarDuracao(servico.duracaoMin)}</span>
                                      </span>
                                      <span className="shrink-0 text-right tabular-nums">
                                        {servico.aPartirDe && servico.preco > 0 && <span className="block text-[11px] text-cinza">a partir de</span>}
                                        <span className="text-[16px]">{formatarPrecoCurto(servico.preco)}</span>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                          </ul>

                          {escolhidos.length > 0 && (
                            <div>
                              <p className="rotulo mb-3 text-cinza">Escolhidos</p>
                              <div className="flex flex-wrap gap-2">
                                {escolhidos.map((servico) => (
                                  <button
                                    key={servico.id}
                                    type="button"
                                    onClick={() => alternarServico(servico.id)}
                                    aria-label={`Tirar ${servico.nome}`}
                                    className="flex items-center gap-2 rounded-full border border-vermelho-vivo/50 bg-vermelho/10 py-1.5 pl-3.5 pr-2.5 text-sm text-giz transition-colors hover:border-vermelho-vivo"
                                  >
                                    {servico.nome}
                                    <IconeFechar className="h-3.5 w-3.5 text-vermelho-vivo" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {etapa === 2 && (
                    <div className="space-y-8">
                      <TituloEtapa titulo="Escolha o horário" texto="Só aparecem horários em que todos os serviços cabem antes do fechamento." />

                      <dl className="divide-y divide-linha rounded-2xl border border-linha bg-carvao">
                        <LinhaResumo
                          rotulo="Dia"
                          valor={dataValida ? formatarDataLonga(data) : "Escolha um dia"}
                          detalhe={expediente ? `Atendimento das ${expediente.inicio} às ${expediente.fim}` : ""}
                          onAlterar={() => irPara(0)}
                        />
                        <LinhaResumo
                          rotulo="Serviços"
                          valor={escolhidos.map((servico) => servico.nome).join(" + ")}
                          detalhe={`${formatarDuracao(duracao)} · ${aPartirDe ? "a partir de " : ""}${formatarPreco(total)}`}
                          onAlterar={() => irPara(1)}
                        />
                      </dl>

                      <div>
                        <p className="rotulo mb-3 text-cinza">Horários livres</p>

                        {horaPerdida && (
                          <p className="mb-4 border-l-2 border-vermelho-vivo pl-3 text-sm text-giz">
                            O horário das {hora} acabou de ser reservado por outra pessoa. Escolha outro.
                          </p>
                        )}

                        {disponibilidade.carregando ? (
                          <div className="flex items-center gap-3 py-8 text-sm text-cinza">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-linha border-t-vermelho-vivo" />
                            Conferindo a agenda…
                          </div>
                        ) : disponibilidade.falhou ? (
                          <Aviso>
                            Não foi possível consultar a agenda.{" "}
                            <button type="button" onClick={disponibilidade.recarregar} className="font-semibold text-vermelho-vivo underline">
                              Tentar de novo
                            </button>
                          </Aviso>
                        ) : livres.length === 0 ? (
                          <div className="rounded-2xl border border-linha p-6 text-center">
                            <IconeTesoura className="mx-auto h-7 w-7 text-cinza" />
                            <p className="mt-3 font-medium">Nenhum horário livre neste dia</p>
                            <p className="mt-1 text-sm text-cinza">Tente outro dia ou menos serviços no mesmo atendimento.</p>
                            <div className="mt-5 grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => irPara(0)} className="botao-contorno text-sm">
                                Trocar o dia
                              </button>
                              <button type="button" onClick={() => irPara(1)} className="botao-contorno text-sm">
                                Rever serviços
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                                  className={`rounded-[10px] border px-2 py-3 text-center transition-colors ${
                                    marcado ? "border-vermelho bg-vermelho text-white" : "border-linha bg-carvao hover:border-giz/40"
                                  }`}
                                >
                                  <span className="block text-[17px] font-semibold tabular-nums">{horario}</span>
                                  <span className={`block text-[11px] tabular-nums ${marcado ? "text-white/80" : "text-cinza"}`}>
                                    até {minutosParaHora(horaParaMinutos(horario) + duracao)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Campo rotulo="Recado para o estúdio (opcional)">
                        <textarea
                          className="campo min-h-[84px] resize-none"
                          maxLength={280}
                          placeholder="Ex.: quero manter o comprimento"
                          value={observacao}
                          onChange={(evento) => setObservacao(evento.target.value)}
                        />
                      </Campo>

                      <p className="text-sm text-cinza">
                        Precisa de um horário que não aparece aqui?{" "}
                        <a
                          href={linkWhatsApp(ESTUDIO.whatsapp, "Olá! Queria ver um horário que não aparece no site.")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-giz underline decoration-vermelho-vivo underline-offset-4"
                        >
                          Fale no WhatsApp
                        </a>
                      </p>
                    </div>
                  )}
                </motion.section>
              </AnimatePresence>
            </>
          )}
        </main>

        {!reservado && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-tinta/95 backdrop-blur-md">
            <div className="mx-auto max-w-xl px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <AnimatePresence>
                {erro && (
                  <motion.p
                    key={erro}
                    role="alert"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-3 border-l-2 border-vermelho-vivo pl-3 text-sm font-medium text-giz"
                  >
                    {erro}
                  </motion.p>
                )}
              </AnimatePresence>

              {etapa > 0 && escolhidos.length > 0 && (
                <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-cinza">
                    {horaEscolhida
                      ? `${formatarDataCurta(data)} às ${horaEscolhida} · ${formatarDuracao(duracao)}`
                      : `${plural(escolhidos.length, "serviço")} · ${formatarDuracao(duracao)}`}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {aPartirDe && <span className="font-normal text-cinza">a partir de </span>}
                    {formatarPreco(total)}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                {etapa > 0 && (
                  <button
                    type="button"
                    onClick={() => irPara(etapa - 1)}
                    disabled={salvando}
                    aria-label="Voltar ao passo anterior"
                    className="botao-contorno h-14 w-14 shrink-0 px-0"
                  >
                    <IconeSeta direcao="esquerda" className="h-5 w-5" />
                  </button>
                )}
                <button type="button" onClick={avancar} disabled={salvando} className="botao-vermelho h-14 flex-1 text-base">
                  {salvando ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Reservando…
                    </>
                  ) : (
                    <>
                      {ROTULO_AVANCAR[etapa]}
                      {etapa < ETAPAS.length - 1 && <IconeSeta />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

/* ─── Partes da tela ─── */

function IndicadorEtapas({
  etapa,
  podeIrPara,
  onIrPara,
}: {
  etapa: number;
  podeIrPara: (indice: number) => boolean;
  onIrPara: (indice: number) => void;
}) {
  return (
    <ol className="mb-8 flex items-center">
      {ETAPAS.map((titulo, indice) => {
        const feita = indice < etapa;
        const atual = indice === etapa;
        return (
          <li key={titulo} className={`flex items-center ${indice < ETAPAS.length - 1 ? "flex-1" : ""}`}>
            <button
              type="button"
              onClick={() => onIrPara(indice)}
              disabled={atual || !podeIrPara(indice)}
              aria-current={atual ? "step" : undefined}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  feita
                    ? "bg-vermelho text-white"
                    : atual
                      ? "border-2 border-vermelho-vivo text-giz"
                      : "border border-linha text-cinza"
                }`}
              >
                {feita ? <IconeCheck className="h-3.5 w-3.5" /> : indice + 1}
              </span>
              <span className={`whitespace-nowrap text-[13px] ${atual ? "font-semibold text-giz" : "text-cinza"} ${atual ? "" : "hidden sm:inline"}`}>
                {titulo}
              </span>
            </button>
            {indice < ETAPAS.length - 1 && (
              <span className="mx-3 h-px flex-1 bg-linha">
                <span className={`block h-px bg-vermelho-vivo transition-all duration-500 ${feita ? "w-full" : "w-0"}`} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TituloEtapa({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h1 className="font-display text-[2.1rem] font-medium leading-tight">{titulo}</h1>
      <p className="mt-1.5 text-cinza">{texto}</p>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="rotulo mb-2 block text-cinza">{rotulo}</span>
      {children}
    </label>
  );
}

function Caixa({ marcada }: { marcada: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
        marcada ? "border-vermelho bg-vermelho text-white" : "border-cinza/40"
      }`}
    >
      {marcada && <IconeCheck className="h-4 w-4" />}
    </span>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-linha bg-carvao p-5 text-sm text-cinza">{children}</div>;
}

function LinhaResumo({
  rotulo,
  valor,
  detalhe,
  onAlterar,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  onAlterar: () => void;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <dt className="rotulo text-cinza">{rotulo}</dt>
        <dd className="mt-1 font-medium leading-snug">{valor}</dd>
        {detalhe && <dd className="text-sm text-cinza">{detalhe}</dd>}
      </div>
      <button type="button" onClick={onAlterar} className="shrink-0 py-1 text-sm font-medium text-vermelho-vivo hover:underline">
        Alterar
      </button>
    </div>
  );
}

function EscolhaDeDia({
  datas,
  hoje,
  selecionada,
  onEscolher,
}: {
  datas: string[];
  hoje: string;
  selecionada: string;
  onEscolher: (data: string) => void;
}) {
  const [pagina, setPagina] = useState(() => Math.max(0, Math.floor(datas.indexOf(selecionada) / DATAS_POR_PAGINA)));

  if (datas.length === 0) {
    return (
      <Aviso>
        Não há dias abertos para agendar agora. Fale com o estúdio pelo{" "}
        <a className="font-semibold text-vermelho-vivo underline" href={linkWhatsApp(ESTUDIO.whatsapp)}>
          WhatsApp
        </a>
        .
      </Aviso>
    );
  }

  const ultimaPagina = Math.ceil(datas.length / DATAS_POR_PAGINA) - 1;
  const paginaAtual = Math.min(pagina, ultimaPagina);
  const visiveis = datas.slice(paginaAtual * DATAS_POR_PAGINA, (paginaAtual + 1) * DATAS_POR_PAGINA);
  const amanha = hoje ? somarDias(hoje, 1) : "";

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {visiveis.map((valor) => {
          const partes = partesDaData(valor);
          const escolhida = valor === selecionada;
          const apelido = valor === hoje ? "hoje" : valor === amanha ? "amanhã" : partes.semana;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={escolhida}
              aria-label={formatarDataLonga(valor)}
              onClick={() => onEscolher(valor)}
              className={`flex h-[92px] flex-col items-center justify-center rounded-[10px] border transition-colors ${
                escolhida ? "border-vermelho bg-vermelho text-white" : "border-linha bg-carvao hover:border-giz/40"
              }`}
            >
              <span className={`rotulo ${escolhida ? "text-white/85" : "text-cinza"}`}>{apelido}</span>
              <span className="font-display text-[2rem] leading-tight">{partes.dia}</span>
              <span className={`text-xs ${escolhida ? "text-white/85" : "text-cinza"}`}>{partes.mes}</span>
            </button>
          );
        })}
      </div>

      {ultimaPagina > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPagina(Math.max(0, paginaAtual - 1))}
            disabled={paginaAtual === 0}
            className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-cinza transition-colors hover:text-giz disabled:invisible"
          >
            <IconeSeta direcao="esquerda" className="h-3.5 w-3.5" /> Anteriores
          </button>
          <button
            type="button"
            onClick={() => setPagina(paginaAtual + 1)}
            disabled={paginaAtual >= ultimaPagina}
            className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-cinza transition-colors hover:text-giz disabled:invisible"
          >
            Próximos dias <IconeSeta className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function HorarioReservado({
  agendamento,
  nome,
  telefone,
  onAgendarOutro,
}: {
  agendamento: AgendamentoDaCliente;
  nome: string;
  telefone: string;
  onAgendarOutro: () => void;
}) {
  const primeiroNome = nome.split(" ")[0];
  const mensagem =
    `Olá! Acabei de agendar pelo site: ${agendamento.resumo}, ` +
    `${formatarDataCurta(agendamento.data)} às ${agendamento.hora} (comanda Nº ${agendamento.codigo}).`;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="rotulo text-vermelho-vivo">Tudo certo</p>
        <h1 className="mt-2 font-display text-[2.4rem] font-medium leading-[1.05]">{primeiroNome}, seu horário está reservado.</h1>
        <p className="mt-3 text-cinza">
          O estúdio vai confirmar com você pelo WhatsApp <span className="whitespace-nowrap text-giz">{telefone}</span>.
        </p>
      </motion.div>

      {/* A comanda "sai da impressora" de cima para baixo. */}
      <motion.div
        initial={{ clipPath: "inset(0 0 100% 0)", y: -8 }}
        animate={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.3, 0.7, 0.2, 1] }}
      >
        <Comanda agendamento={agendamento} />
      </motion.div>

      <div className="space-y-3">
        <Link href="/meu-horario" className="botao-contorno h-14 w-full">
          Ver ou cancelar meus horários
        </Link>
        <a
          href={linkWhatsApp(ESTUDIO.whatsapp, mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-contorno h-14 w-full"
        >
          <IconeWhatsApp /> Falar com o estúdio
        </a>
        <div className="flex items-center justify-between pt-2 text-sm">
          <button type="button" onClick={onAgendarOutro} className="py-2 font-medium text-vermelho-vivo hover:underline">
            Agendar outro horário
          </button>
          <Link href="/" className="py-2 text-cinza hover:text-giz">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
