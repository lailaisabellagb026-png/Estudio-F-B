"use client";

import { useCallback, useEffect, useState } from "react";
import type { Agendamento } from "@/lib/tipos";
import { chamarApi } from "./api";

/**
 * Agendamentos de um período para o painel. Atualiza sozinho a cada
 * 30 segundos e quando a aba volta ao foco, para mostrar reservas novas.
 */
export function useAgendamentos(de: string, ate: string) {
  const [estado, setEstado] = useState<{ chave: string; lista: Agendamento[]; erro: string } | null>(null);
  const [versao, setVersao] = useState(0);
  const chave = `${de}|${ate}`;

  useEffect(() => {
    if (!de || !ate) return;
    let ativo = true;
    chamarApi<{ agendamentos: Agendamento[] }>(`/api/admin/agendamentos?de=${de}&ate=${ate}`)
      .then(({ agendamentos }) => {
        if (ativo) setEstado({ chave, lista: agendamentos, erro: "" });
      })
      .catch((erro: Error) => {
        if (ativo) setEstado((atual) => ({ chave, lista: atual?.chave === chave ? atual.lista : [], erro: erro.message }));
      });
    return () => {
      ativo = false;
    };
  }, [chave, de, ate, versao]);

  useEffect(() => {
    const atualizar = () => setVersao((atual) => atual + 1);
    const intervalo = window.setInterval(atualizar, 30_000);
    window.addEventListener("focus", atualizar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", atualizar);
    };
  }, []);

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);

  /** Troca um item na lista sem esperar a próxima atualização. */
  const substituir = useCallback((agendamento: Agendamento) => {
    setEstado((atual) =>
      atual ? { ...atual, lista: atual.lista.map((item) => (item.id === agendamento.id ? agendamento : item)) } : atual,
    );
  }, []);

  const remover = useCallback((id: string) => {
    setEstado((atual) => (atual ? { ...atual, lista: atual.lista.filter((item) => item.id !== id) } : atual));
  }, []);

  const doPeriodo = estado?.chave === chave ? estado : null;
  return {
    agendamentos: doPeriodo?.lista ?? [],
    carregando: !doPeriodo,
    erro: doPeriodo?.erro ?? "",
    recarregar,
    substituir,
    remover,
  };
}
