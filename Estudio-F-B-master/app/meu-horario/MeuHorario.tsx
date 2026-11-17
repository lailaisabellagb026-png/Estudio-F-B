"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Comanda } from "@/components/Comanda";
import { IconeSeta, IconeTesoura, IconeWhatsApp } from "@/components/Icones";
import { MarcaFB } from "@/components/MarcaFB";
import { ESTUDIO } from "@/lib/estudio";
import { formatarDataCurta, formatarDataLonga, formatarTelefone, linkWhatsApp, telefoneValido } from "@/lib/formatos";
import { useClienteSalva } from "@/lib/noNavegador";
import type { AgendamentoDaCliente } from "@/lib/tipos";

export function MeuHorario() {
  const clienteSalva = useClienteSalva();
  const [telefoneDigitado, setTelefoneDigitado] = useState<string | null>(null);
  const telefone = telefoneDigitado ?? (clienteSalva ? formatarTelefone(clienteSalva.telefone) : "");

  const [horarios, setHorarios] = useState<AgendamentoDaCliente[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    if (!telefoneValido(telefone)) {
      setErro("Digite o WhatsApp com DDD, do mesmo jeito que usou no agendamento.");
      return;
    }
    setBuscando(true);
    setErro("");
    setAviso("");
    try {
      const resposta = await fetch("/api/meus-horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Não foi possível buscar agora. Tente de novo.");
        return;
      }
      setHorarios(corpo.agendamentos);
    } catch {
      setErro("Sem conexão com a internet. Confira e tente de novo.");
    } finally {
      setBuscando(false);
    }
  }

  async function cancelar(agendamento: AgendamentoDaCliente) {
    setCancelando(agendamento.id);
    setErro("");
    try {
      const resposta = await fetch("/api/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agendamento.id, telefone }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Não foi possível cancelar. Tente de novo.");
        return;
      }
      setHorarios((atuais) => atuais?.filter((item) => item.id !== agendamento.id) ?? null);
      setAviso(`Horário de ${formatarDataCurta(agendamento.data)} às ${agendamento.hora} cancelado e liberado na agenda do estúdio.`);
      setConfirmando(null);
    } catch {
      setErro("Sem conexão com a internet. Confira e tente de novo.");
    } finally {
      setCancelando(null);
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
            <p className="flex-1 font-display text-xl">Meu horário</p>
            <MarcaFB />
          </div>
        </header>

        <main className="mx-auto max-w-xl px-5 pb-20 pt-8">
          <h1 className="font-display text-[2.4rem] font-medium leading-tight">Seus horários</h1>
          <p className="mt-2 text-cinza">Digite o WhatsApp usado no agendamento para ver ou cancelar seus próximos horários.</p>

          <form onSubmit={buscar} className="mt-8 space-y-3">
            <label className="block">
              <span className="rotulo mb-2 block text-cinza">WhatsApp com DDD</span>
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
            </label>
            <button type="submit" disabled={buscando} className="botao-vermelho h-14 w-full text-base">
              {buscando ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Buscando…
                </>
              ) : (
                "Buscar meus horários"
              )}
            </button>
          </form>

          <AnimatePresence>
            {erro && (
              <motion.p
                key={erro}
                role="alert"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 border-l-2 border-vermelho-vivo pl-3 text-sm font-medium"
              >
                {erro}
              </motion.p>
            )}
            {aviso && (
              <motion.p
                key={aviso}
                role="status"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 border-l-2 border-giz pl-3 text-sm"
              >
                {aviso}
              </motion.p>
            )}
          </AnimatePresence>

          {horarios && (
            <section className="mt-10 space-y-8" aria-live="polite">
              {horarios.length === 0 ? (
                <div className="rounded-2xl border border-linha p-7 text-center">
                  <IconeTesoura className="mx-auto h-7 w-7 text-cinza" />
                  <p className="mt-3 font-medium">Nenhum horário marcado para este WhatsApp</p>
                  <p className="mt-1 text-sm text-cinza">Confira o número ou marque um novo horário.</p>
                  <Link href="/agendar" className="botao-vermelho mt-6 h-12 px-6">
                    Agendar horário
                  </Link>
                </div>
              ) : (
                horarios.map((agendamento) => (
                  <motion.div key={agendamento.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Comanda agendamento={agendamento}>
                      <div className="mt-6 border-t border-dashed border-giz/20 pt-5">
                        {confirmando === agendamento.id ? (
                          <div>
                            <p className="text-sm font-medium">
                              Cancelar o horário de {formatarDataLonga(agendamento.data).toLocaleLowerCase("pt-BR")} às {agendamento.hora}?
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => cancelar(agendamento)}
                                disabled={cancelando === agendamento.id}
                                className="botao bg-vermelho px-3 text-white hover:bg-vermelho-escuro"
                              >
                                {cancelando === agendamento.id ? "Cancelando…" : "Sim, cancelar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmando(null)}
                                className="botao border border-giz/20 px-3 text-giz hover:border-giz/50"
                              >
                                Manter horário
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <a
                              href={linkWhatsApp(
                                ESTUDIO.whatsapp,
                                `Olá! Sobre meu horário de ${formatarDataCurta(agendamento.data)} às ${agendamento.hora} (comanda Nº ${agendamento.codigo}).`,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 py-2 text-sm font-medium text-giz hover:underline"
                            >
                              <IconeWhatsApp className="h-4 w-4" /> Falar com o estúdio
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmando(agendamento.id);
                                setAviso("");
                              }}
                              className="py-2 text-sm font-semibold text-vermelho hover:underline"
                            >
                              Cancelar horário
                            </button>
                          </div>
                        )}
                      </div>
                    </Comanda>
                  </motion.div>
                ))
              )}
            </section>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}
