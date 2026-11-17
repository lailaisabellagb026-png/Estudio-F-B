"use client";

/** Chama uma rota da API e devolve o JSON, ou lança um Error com a mensagem pronta para a tela. */
export async function chamarApi<T>(url: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: opcoes.metodo ?? "GET",
      headers: opcoes.corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
    });
  } catch {
    throw new Error("Sem conexão com a internet. Confira e tente de novo.");
  }

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro ?? "Não foi possível concluir agora. Tente de novo.");
  return corpo as T;
}
