import "server-only";
import { readFileSync } from "node:fs";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

interface ContaDeServico {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let conta: ContaDeServico | null = null;
let firestore: Firestore | null = null;

/**
 * Lê a conta de serviço do Firebase da variável FIREBASE_SERVICE_ACCOUNT,
 * que pode conter o JSON inteiro (Vercel) ou o caminho do arquivo .json
 * baixado do Firebase (computador local).
 */
export function contaDeServico(): ContaDeServico {
  if (conta) return conta;

  const valor = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!valor) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não está configurada. Veja o README, seção Variáveis de ambiente.");
  }

  let dados: Record<string, unknown>;
  try {
    dados = JSON.parse(valor.startsWith("{") ? valor : readFileSync(valor, "utf8"));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT inválida: cole o conteúdo completo do arquivo .json da conta de serviço.");
  }

  const { project_id, client_email, private_key } = dados;
  if (typeof project_id !== "string" || typeof client_email !== "string" || typeof private_key !== "string") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT incompleta: faltam project_id, client_email ou private_key.");
  }

  conta = {
    projectId: project_id,
    clientEmail: client_email,
    // Alguns painéis guardam as quebras de linha da chave como "\n" literal.
    privateKey: private_key.replace(/\\n/g, "\n"),
  };
  return conta;
}

/** Firestore com acesso de administrador. Só existe no servidor. */
export function banco(): Firestore {
  if (firestore) return firestore;
  const credenciais = contaDeServico();
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(credenciais), projectId: credenciais.projectId });
  firestore = getFirestore(app);
  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Em desenvolvimento o módulo recarrega e a instância já vem configurada.
  }
  return firestore;
}
