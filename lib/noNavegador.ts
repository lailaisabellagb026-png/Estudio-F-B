"use client";

import { useSyncExternalStore } from "react";
import { agoraNoEstudio, type Agora } from "./tempo";

// ── Relógio do estúdio ──
// Atualiza a cada 20 segundos; no servidor fica nulo para a primeira
// renderização no celular bater com o HTML recebido.

let agoraEmCache: Agora | null = null;
let chaveDoAgora = "";

function lerAgora() {
  const agora = agoraNoEstudio();
  const chave = `${agora.data} ${agora.minutos}`;
  if (chave !== chaveDoAgora) {
    chaveDoAgora = chave;
    agoraEmCache = agora;
  }
  return agoraEmCache;
}

function assinarRelogio(avisar: () => void) {
  const intervalo = window.setInterval(avisar, 20_000);
  return () => window.clearInterval(intervalo);
}

export function useAgora() {
  return useSyncExternalStore(assinarRelogio, lerAgora, () => null);
}

// ── Nome e WhatsApp lembrados neste aparelho ──
// Só para preencher o formulário da próxima vez; nada depende disso.

export interface ClienteSalva {
  nome: string;
  telefone: string;
}

const CHAVE_CLIENTE = "fb:cliente";
let clienteBruto: string | null | undefined;
let clienteEmCache: ClienteSalva | null = null;

function lerCliente() {
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE_CLIENTE);
  } catch {
    bruto = null;
  }
  if (bruto !== clienteBruto) {
    clienteBruto = bruto;
    try {
      const valor = bruto ? JSON.parse(bruto) : null;
      clienteEmCache =
        valor && typeof valor.nome === "string" && typeof valor.telefone === "string"
          ? { nome: valor.nome, telefone: valor.telefone }
          : null;
    } catch {
      clienteEmCache = null;
    }
  }
  return clienteEmCache;
}

function assinarCliente(avisar: () => void) {
  window.addEventListener("storage", avisar);
  return () => window.removeEventListener("storage", avisar);
}

export function useClienteSalva() {
  return useSyncExternalStore(assinarCliente, lerCliente, () => null);
}

export function lembrarCliente(cliente: ClienteSalva) {
  try {
    window.localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(cliente));
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue sem lembrar.
  }
}
