import "server-only";
import { FieldValue, type DocumentSnapshot, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { DIAS_PARA_AGENDAR, inicioPermitido, type Ocupado } from "@/lib/agenda";
import type { Servico } from "@/lib/catalogo";
import { somenteDigitos, telefoneValido } from "@/lib/formatos";
import {
  type ConfiguracaoHorarios,
  dataEstaAberta,
  dataValida,
  horaParaMinutos,
  horariosDoDia,
  horarioValido,
  minutosParaHora,
  somarDias,
  temConflito,
} from "@/lib/horariosAtendimento";
import { agoraNoEstudio } from "@/lib/tempo";
import type {
  Agendamento,
  AgendamentoDaCliente,
  DadosAgendamento,
  ServicoAgendado,
  StatusAgendamento,
} from "@/lib/tipos";
import { carregarConfiguracao } from "./config";
import { banco } from "./firebaseAdmin";
import { ErroDeNegocio } from "./http";

type Origem = Agendamento["origem"];

const LIMITE_NOME = 60;
const LIMITE_OBSERVACAO = 280;
// Quantos horários futuros um mesmo WhatsApp pode ter marcados pelo site.
const LIMITE_HORARIOS_POR_CLIENTE = 3;
const STATUS: StatusAgendamento[] = ["pendente", "confirmado", "concluido", "cancelado"];

function colecao() {
  return banco().collection("agendamentos");
}

// Um documento por dia, gravado em toda reserva daquele dia. Duas reservas
// simultâneas para a mesma data disputam este documento e o Firestore
// refaz a segunda transação, que então enxerga a primeira.
function trava(data: string) {
  return banco().collection("travas").doc(data);
}

function paraAgendamento(doc: DocumentSnapshot): Agendamento {
  const d = doc.data() ?? {};
  const hora = horarioValido(d.hora) ? d.hora : "00:00";
  const duracaoMin = Number(d.duracaoMin) || 0;
  return {
    id: doc.id,
    codigo: doc.id.slice(0, 6).toUpperCase(),
    nomeCliente: String(d.nomeCliente ?? ""),
    telefone: String(d.telefone ?? ""),
    data: String(d.data ?? ""),
    hora,
    fim: minutosParaHora(horaParaMinutos(hora) + duracaoMin),
    servicos: Array.isArray(d.servicos) ? d.servicos : [],
    resumo: String(d.resumo ?? ""),
    duracaoMin,
    valor: Number(d.valor) || 0,
    aPartirDe: d.aPartirDe === true,
    valorCobrado: typeof d.valorCobrado === "number" ? d.valorCobrado : null,
    observacao: String(d.observacao ?? ""),
    status: STATUS.includes(d.status) ? d.status : "pendente",
    origem: d.origem === "estudio" ? "estudio" : "site",
    criadoEm: typeof d.criadoEm?.toDate === "function" ? d.criadoEm.toDate().toISOString() : "",
  };
}

export function paraCliente(a: Agendamento): AgendamentoDaCliente {
  return {
    id: a.id,
    codigo: a.codigo,
    data: a.data,
    hora: a.hora,
    fim: a.fim,
    resumo: a.resumo,
    servicos: a.servicos,
    duracaoMin: a.duracaoMin,
    valor: a.valor,
    aPartirDe: a.aPartirDe,
    status: a.status,
  };
}

// ── Validação ──

function lerDados(entrada: Partial<DadosAgendamento>) {
  const nomeCliente = String(entrada.nomeCliente ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_NOME);
  if (nomeCliente.length < 2) throw new ErroDeNegocio("Informe o nome.");

  const telefone = somenteDigitos(String(entrada.telefone ?? ""));
  if (!telefoneValido(telefone)) throw new ErroDeNegocio("Informe um WhatsApp com DDD, só números.");

  if (!dataValida(entrada.data)) throw new ErroDeNegocio("Escolha uma data.");
  if (!horarioValido(entrada.hora)) throw new ErroDeNegocio("Escolha um horário.");

  const servicoIds = Array.isArray(entrada.servicoIds)
    ? [...new Set(entrada.servicoIds.filter((id): id is string => typeof id === "string"))]
    : [];
  if (servicoIds.length === 0) throw new ErroDeNegocio("Escolha pelo menos um serviço.");
  if (servicoIds.length > 8) throw new ErroDeNegocio("Escolha no máximo 8 serviços por atendimento.");

  const observacao = String(entrada.observacao ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_OBSERVACAO);

  return { nomeCliente, telefone, data: entrada.data, hora: entrada.hora, servicoIds, observacao };
}

function montarServicos(ids: string[], catalogo: Servico[], origem: Origem, atuais: ServicoAgendado[] = []) {
  const servicos = ids.map((id): ServicoAgendado | undefined => {
    const doCatalogo = catalogo.find((servico) => servico.id === id);
    if (doCatalogo && (doCatalogo.ativo || origem === "estudio")) {
      const { nome, categoria, preco, aPartirDe, duracaoMin } = doCatalogo;
      return { id, nome, categoria, preco, aPartirDe, duracaoMin };
    }
    // Na edição pelo estúdio, um serviço que saiu do catálogo continua valendo.
    return origem === "estudio" ? atuais.find((servico) => servico.id === id) : undefined;
  });
  if (servicos.some((servico) => !servico)) {
    throw new ErroDeNegocio("Um dos serviços escolhidos não está mais disponível. Revise a seleção.", 409);
  }
  const lista = servicos as ServicoAgendado[];
  return {
    servicos: lista,
    resumo: lista.map((servico) => servico.nome).join(" + "),
    duracaoMin: lista.reduce((total, servico) => total + servico.duracaoMin, 0),
    valor: Math.round(lista.reduce((total, servico) => total + servico.preco, 0) * 100) / 100,
    aPartirDe: lista.some((servico) => servico.aPartirDe),
  };
}

function validarHorario(
  data: string,
  hora: string,
  duracaoMin: number,
  origem: Origem,
  configuracao: ConfiguracaoHorarios,
) {
  const agora = agoraNoEstudio();

  const [menor, maior] = origem === "site"
    ? [agora.data, somarDias(agora.data, DIAS_PARA_AGENDAR)]
    : [somarDias(agora.data, -60), somarDias(agora.data, 365)];
  if (data < menor || data > maior) throw new ErroDeNegocio("Essa data não está disponível para agendamento.", 409);

  if (!dataEstaAberta(data, configuracao)) {
    throw new ErroDeNegocio("O estúdio não abre nessa data. Escolha outro dia.", 409);
  }

  const { horarios, fechamento } = horariosDoDia(data, configuracao);
  const inicio = horaParaMinutos(hora);
  if (!horarios.includes(hora)) throw new ErroDeNegocio("Esse horário não faz parte do expediente.", 409);
  if (inicio + duracaoMin > fechamento) {
    throw new ErroDeNegocio("Os serviços terminariam depois do fechamento. Escolha um horário mais cedo.", 409);
  }
  if (origem === "site" && inicio < inicioPermitido(data, agora)) {
    throw new ErroDeNegocio("Esse horário já passou. Escolha outro.", 409);
  }
}

function conferirConflito(docs: QueryDocumentSnapshot[], inicio: number, fim: number, ignorarId?: string) {
  const ocupado = docs.some((doc) => {
    if (doc.id === ignorarId) return false;
    const existente = doc.data();
    if (existente.status === "cancelado" || !horarioValido(existente.hora)) return false;
    const inicioExistente = horaParaMinutos(existente.hora);
    return temConflito(inicio, fim, inicioExistente, inicioExistente + (Number(existente.duracaoMin) || 0));
  });
  if (ocupado) throw new ErroDeNegocio("Esse horário acabou de ser reservado. Escolha outro.", 409);
}

async function travarDia(t: Transaction, data: string) {
  await t.get(trava(data));
  return (await t.get(colecao().where("data", "==", data))).docs;
}

function marcarDia(t: Transaction, data: string) {
  t.set(trava(data), { atualizadoEm: FieldValue.serverTimestamp() });
}

// ── Consultas ──

/** Intervalos ocupados de um dia, sem nenhum dado das clientes. */
export async function ocupadosNaData(data: string): Promise<Ocupado[]> {
  const snap = await colecao().where("data", "==", data).get();
  return snap.docs
    .map(paraAgendamento)
    .filter((a) => a.status !== "cancelado")
    .map((a) => ({ inicio: a.hora, fim: a.fim }))
    .sort((x, y) => x.inicio.localeCompare(y.inicio));
}

export async function listarAgendamentos(de: string, ate: string): Promise<Agendamento[]> {
  const snap = await colecao().where("data", ">=", de).where("data", "<=", ate).get();
  return snap.docs
    .map(paraAgendamento)
    .sort((x, y) => x.data.localeCompare(y.data) || x.hora.localeCompare(y.hora));
}

/** Próximos horários ativos de um telefone, para a página "Meu horário". */
export async function horariosDaCliente(telefone: string): Promise<AgendamentoDaCliente[]> {
  const numeros = somenteDigitos(telefone);
  if (!telefoneValido(numeros)) throw new ErroDeNegocio("Digite o WhatsApp usado no agendamento, com DDD.");
  const hoje = agoraNoEstudio().data;
  const snap = await colecao().where("telefone", "==", numeros).get();
  return snap.docs
    .map(paraAgendamento)
    .filter((a) => a.data >= hoje && (a.status === "pendente" || a.status === "confirmado"))
    .sort((x, y) => x.data.localeCompare(y.data) || x.hora.localeCompare(y.hora))
    .map(paraCliente);
}

// ── Criação e alterações ──

export async function criarAgendamento(entrada: Partial<DadosAgendamento>, origem: Origem): Promise<Agendamento> {
  const dados = lerDados(entrada);
  const configuracao = await carregarConfiguracao();
  const servicos = montarServicos(dados.servicoIds, configuracao.servicos, origem);
  validarHorario(dados.data, dados.hora, servicos.duracaoMin, origem, configuracao.horarios);

  if (origem === "site") {
    const marcados = await horariosDaCliente(dados.telefone);
    if (marcados.length >= LIMITE_HORARIOS_POR_CLIENTE) {
      throw new ErroDeNegocio(
        `Este WhatsApp já tem ${marcados.length} horários marcados. Para marcar mais, fale com o estúdio.`,
        409,
      );
    }
  }

  const inicio = horaParaMinutos(dados.hora);
  const ref = colecao().doc();
  const registro = {
    nomeCliente: dados.nomeCliente,
    telefone: dados.telefone,
    data: dados.data,
    hora: dados.hora,
    ...servicos,
    observacao: dados.observacao,
    valorCobrado: null,
    // Horários criados pelo próprio estúdio já nascem confirmados.
    status: origem === "estudio" ? "confirmado" : "pendente",
    origem,
    criadoEm: FieldValue.serverTimestamp(),
  };

  await banco().runTransaction(async (t) => {
    const docsDoDia = await travarDia(t, dados.data);
    conferirConflito(docsDoDia, inicio, inicio + servicos.duracaoMin);
    marcarDia(t, dados.data);
    t.create(ref, registro);
  });

  return paraAgendamento(await ref.get());
}

export async function cancelarPelaCliente(id: string, telefone: string): Promise<Agendamento> {
  const numeros = somenteDigitos(telefone);
  const ref = colecao().doc(id);
  return banco().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new ErroDeNegocio("Horário não encontrado.", 404);
    const agendamento = paraAgendamento(snap);
    if (!numeros || agendamento.telefone !== numeros) {
      throw new ErroDeNegocio("Esse WhatsApp não corresponde ao agendamento.", 403);
    }
    if (agendamento.status === "cancelado") throw new ErroDeNegocio("Este horário já foi cancelado.", 409);
    if (agendamento.status === "concluido") throw new ErroDeNegocio("Este atendimento já foi concluído.", 409);
    const agora = agoraNoEstudio();
    if (agendamento.data < agora.data || (agendamento.data === agora.data && horaParaMinutos(agendamento.hora) <= agora.minutos)) {
      throw new ErroDeNegocio("Esse horário já começou. Fale com o estúdio pelo WhatsApp.", 409);
    }
    t.update(ref, {
      status: "cancelado",
      canceladoPor: "cliente",
      canceladoEm: FieldValue.serverTimestamp(),
    });
    const cancelado: Agendamento = { ...agendamento, status: "cancelado" };
    return cancelado;
  });
}

export type AcaoDoEstudio =
  | { acao: "confirmar" }
  | { acao: "concluir"; valorCobrado: number }
  | { acao: "cancelar" }
  | { acao: "reabrir" }
  | { acao: "editar"; dados: Partial<DadosAgendamento> };

export async function alterarPeloEstudio(id: string, pedido: AcaoDoEstudio): Promise<Agendamento> {
  const ref = colecao().doc(id);

  if (pedido.acao === "editar") {
    const atualSnap = await ref.get();
    if (!atualSnap.exists) throw new ErroDeNegocio("Agendamento não encontrado.", 404);
    const atual = paraAgendamento(atualSnap);
    const dados = lerDados(pedido.dados);
    const configuracao = await carregarConfiguracao();
    const servicos = montarServicos(dados.servicoIds, configuracao.servicos, "estudio", atual.servicos);
    validarHorario(dados.data, dados.hora, servicos.duracaoMin, "estudio", configuracao.horarios);
    const inicio = horaParaMinutos(dados.hora);
    const mudouHorario = dados.data !== atual.data || dados.hora !== atual.hora;

    await banco().runTransaction(async (t) => {
      const docsDoDia = await travarDia(t, dados.data);
      if (atual.status !== "cancelado") conferirConflito(docsDoDia, inicio, inicio + servicos.duracaoMin, id);
      marcarDia(t, dados.data);
      t.update(ref, {
        nomeCliente: dados.nomeCliente,
        telefone: dados.telefone,
        data: dados.data,
        hora: dados.hora,
        ...servicos,
        observacao: dados.observacao,
        atualizadoEm: FieldValue.serverTimestamp(),
        // Novo dia ou hora: os lembretes precisam sair de novo.
        ...(mudouHorario ? { lembreteVespera: false, lembreteProximo: false } : {}),
      });
    });
    return paraAgendamento(await ref.get());
  }

  await banco().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new ErroDeNegocio("Agendamento não encontrado.", 404);
    const atual = paraAgendamento(snap);

    if (pedido.acao === "confirmar") {
      if (atual.status !== "pendente") throw new ErroDeNegocio("Só horários a confirmar podem ser confirmados.", 409);
      t.update(ref, { status: "confirmado", confirmadoEm: FieldValue.serverTimestamp() });
      return;
    }

    if (pedido.acao === "concluir") {
      const valor = Number(pedido.valorCobrado);
      if (!Number.isFinite(valor) || valor < 0 || valor > 100_000) throw new ErroDeNegocio("Informe o valor cobrado.");
      if (atual.status === "cancelado") throw new ErroDeNegocio("Reabra o horário antes de concluir.", 409);
      t.update(ref, {
        status: "concluido",
        valorCobrado: Math.round(valor * 100) / 100,
        concluidoEm: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (pedido.acao === "cancelar") {
      if (atual.status === "cancelado") return;
      t.update(ref, { status: "cancelado", canceladoPor: "estudio", canceladoEm: FieldValue.serverTimestamp() });
      return;
    }

    // Reabrir: um horário cancelado só volta se ninguém tiver ocupado o espaço.
    if (atual.status === "cancelado") {
      const docsDoDia = await travarDia(t, atual.data);
      const inicio = horaParaMinutos(atual.hora);
      conferirConflito(docsDoDia, inicio, inicio + atual.duracaoMin, id);
      marcarDia(t, atual.data);
    }
    t.update(ref, { status: "confirmado", valorCobrado: null, atualizadoEm: FieldValue.serverTimestamp() });
  });

  return paraAgendamento(await ref.get());
}

export async function excluirAgendamento(id: string) {
  await colecao().doc(id).delete();
}

/**
 * Horários de dias anteriores que ficaram em aberto passam a contar como
 * concluídos, com o valor da tabela, para o financeiro não ficar vazio.
 */
export async function concluirDiasAnteriores() {
  const hoje = agoraNoEstudio().data;
  const snap = await colecao().where("status", "in", ["pendente", "confirmado"]).get();
  const antigos = snap.docs.filter((doc) => String(doc.data().data ?? "") < hoje);
  for (let i = 0; i < antigos.length; i += 400) {
    const lote = banco().batch();
    for (const doc of antigos.slice(i, i + 400)) {
      lote.update(doc.ref, {
        status: "concluido",
        valorCobrado: Number(doc.data().valor) || 0,
        concluidoEm: FieldValue.serverTimestamp(),
        concluidoAutomaticamente: true,
      });
    }
    await lote.commit();
  }
  return antigos.length;
}

/** Horários ativos em datas específicas, com as marcas de lembrete. */
export async function ativosNasDatas(datas: string[]) {
  const snap = await colecao().where("data", "in", datas).get();
  return snap.docs
    .filter((doc) => ["pendente", "confirmado"].includes(doc.data().status))
    .map((doc) => ({
      agendamento: paraAgendamento(doc),
      lembreteVespera: doc.data().lembreteVespera === true,
      lembreteProximo: doc.data().lembreteProximo === true,
    }));
}

export async function marcarLembrete(id: string, tipo: "lembreteVespera" | "lembreteProximo") {
  await colecao().doc(id).update({ [tipo]: true });
}
