"use client";

import { useEffect, useState } from "react";
import type { Ocupado } from "@/lib/agenda";

/**
 * Faixas já reservadas no dia escolhido. Com `acompanhar`, a agenda é
 * conferida de novo a cada 30 segundos e sempre que a aba volta ao foco.
 */
export function useDisponibilidade(data: string, acompanhar: boolean) {
  const [estado, setEstado] = useState<{ data: string; ocupados: Ocupado[] | null } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!data) return;
    const controle = new AbortController();
    fetch(`/api/disponibilidade?data=${data}`, { signal: controle.signal, cache: "no-store" })
      .then(async (resposta) => {
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo.erro);
        setEstado({ data, ocupados: corpo.ocupados });
      })
      .catch(() => {
        if (!controle.signal.aborted) setEstado({ data, ocupados: null });
      });
    return () => controle.abort();
  }, [data, versao]);

  useEffect(() => {
    if (!acompanhar || !data) return;
    const atualizar = () => setVersao((atual) => atual + 1);
    const intervalo = window.setInterval(atualizar, 30_000);
    window.addEventListener("focus", atualizar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", atualizar);
    };
  }, [acompanhar, data]);

  const doDia = estado?.data === data ? estado : null;
  return {
    ocupados: doDia?.ocupados ?? null,
    carregando: Boolean(data) && !doDia,
    falhou: Boolean(doDia) && doDia?.ocupados === null,
    recarregar: () => setVersao((atual) => atual + 1),
  };
}
