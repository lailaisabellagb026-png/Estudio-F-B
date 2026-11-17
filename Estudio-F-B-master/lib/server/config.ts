import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { normalizarCatalogo, SERVICOS_PADRAO, type Servico } from "@/lib/catalogo";
import {
  HORARIOS_PADRAO,
  normalizarConfiguracaoHorarios,
  type ConfiguracaoHorarios,
} from "@/lib/horariosAtendimento";
import { banco } from "./firebaseAdmin";

export interface ConfiguracaoEstudio {
  servicos: Servico[];
  horarios: ConfiguracaoHorarios;
}

const PADRAO: ConfiguracaoEstudio = { servicos: SERVICOS_PADRAO, horarios: HORARIOS_PADRAO };

function documento() {
  return banco().collection("configuracoes").doc("estudio");
}

/** Catálogo e expediente salvos no painel (ou os padrões, se nada foi salvo). */
export async function carregarConfiguracao(): Promise<ConfiguracaoEstudio> {
  const snap = await documento().get();
  if (!snap.exists) return PADRAO;
  const dados = snap.data() ?? {};
  return {
    servicos: normalizarCatalogo(dados.servicos),
    horarios: normalizarConfiguracaoHorarios(dados.horarios),
  };
}

/**
 * Versão para as páginas públicas: se o banco ainda não estiver configurado,
 * o site continua no ar com o catálogo padrão.
 */
export async function carregarConfiguracaoParaPagina(): Promise<ConfiguracaoEstudio> {
  try {
    return await carregarConfiguracao();
  } catch (erro) {
    console.error("Configuração do estúdio indisponível, usando o padrão:", erro);
    return PADRAO;
  }
}

export async function salvarServicos(servicos: Servico[]) {
  await documento().set({ servicos, servicosAtualizadosEm: FieldValue.serverTimestamp() }, { merge: true });
}

export async function salvarHorarios(horarios: ConfiguracaoHorarios) {
  await documento().set({ horarios, horariosAtualizadosEm: FieldValue.serverTimestamp() }, { merge: true });
}
