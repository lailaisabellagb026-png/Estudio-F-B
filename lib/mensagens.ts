import { ESTUDIO } from "./estudio";
import { formatarDataCurta, formatarDataLonga, formatarPreco, formatarTelefone, linkWhatsApp } from "./formatos";
import type { Agendamento } from "./tipos";

type Resumo = Pick<Agendamento, "nomeCliente" | "telefone" | "data" | "hora" | "fim" | "resumo" | "valor" | "aPartirDe" | "observacao">;

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

function quando(a: Resumo) {
  return `${formatarDataLonga(a.data).toLocaleLowerCase("pt-BR")}, às ${a.hora}`;
}

function valor(a: Resumo) {
  return `${a.aPartirDe ? "a partir de " : ""}${formatarPreco(a.valor)}`;
}

// ── Mensagens que o estúdio manda para a cliente (abertas no WhatsApp) ──

export function textoConfirmacaoParaCliente(a: Resumo) {
  return (
    `Olá, ${primeiroNome(a.nomeCliente)}! Aqui é do ${ESTUDIO.nome}. ` +
    `Seu horário está confirmado: ${quando(a)} — ${a.resumo}. Até lá!`
  );
}

export function textoLembreteParaCliente(a: Resumo) {
  return (
    `Olá, ${primeiroNome(a.nomeCliente)}! Passando para lembrar do seu horário no ${ESTUDIO.nome}: ` +
    `${quando(a)} — ${a.resumo}. Se precisar remarcar, é só responder aqui.`
  );
}

export function linkConfirmarComCliente(a: Resumo) {
  return linkWhatsApp(a.telefone, textoConfirmacaoParaCliente(a));
}

export function linkLembrarCliente(a: Resumo) {
  return linkWhatsApp(a.telefone, textoLembreteParaCliente(a));
}

// ── Avisos que chegam no WhatsApp do estúdio (CallMeBot) ──

export function avisoNovoAgendamento(a: Resumo, linkPainel: string) {
  return [
    "✂️ *Novo agendamento pelo site*",
    "",
    `👤 ${a.nomeCliente}`,
    `📱 ${formatarTelefone(a.telefone)}`,
    `📅 ${formatarDataLonga(a.data)}, ${a.hora} às ${a.fim}`,
    `💇 ${a.resumo}`,
    `💰 ${valor(a)}`,
    ...(a.observacao ? [`📝 ${a.observacao}`] : []),
    "",
    "Confirmar com a cliente:",
    linkConfirmarComCliente(a),
    "",
    `Painel: ${linkPainel}`,
  ].join("\n");
}

export function avisoCancelamento(a: Resumo) {
  return [
    "❌ *Horário cancelado pela cliente*",
    "",
    `👤 ${a.nomeCliente} · ${formatarTelefone(a.telefone)}`,
    `📅 ${formatarDataLonga(a.data)}, ${a.hora}`,
    `💇 ${a.resumo}`,
    "",
    "O horário já está livre no site.",
  ].join("\n");
}

export function avisoLembreteVespera(a: Resumo) {
  return [
    `⏰ *Amanhã, ${formatarDataCurta(a.data)} às ${a.hora}*`,
    "",
    `👤 ${a.nomeCliente} · ${formatarTelefone(a.telefone)}`,
    `💇 ${a.resumo}`,
    "",
    "Lembrar a cliente:",
    linkLembrarCliente(a),
  ].join("\n");
}

export function avisoLembreteProximo(a: Resumo) {
  return [
    `🔔 *Daqui a pouco, às ${a.hora}*`,
    "",
    `👤 ${a.nomeCliente}`,
    `💇 ${a.resumo} (até ${a.fim})`,
  ].join("\n");
}
