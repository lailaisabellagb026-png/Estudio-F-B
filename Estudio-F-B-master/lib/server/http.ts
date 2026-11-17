import "server-only";
import { NextResponse } from "next/server";

/** Erro com mensagem pronta para mostrar na tela. */
export class ErroDeNegocio extends Error {
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
  }
}

export function responderErro(erro: unknown) {
  if (erro instanceof ErroDeNegocio) {
    return NextResponse.json({ erro: erro.message }, { status: erro.status });
  }
  console.error(erro);
  return NextResponse.json(
    { erro: "Não foi possível concluir agora. Tente de novo em alguns instantes." },
    { status: 500 },
  );
}

export async function lerCorpo<T = Record<string, unknown>>(request: Request): Promise<Partial<T>> {
  try {
    const corpo = await request.json();
    return corpo && typeof corpo === "object" ? corpo : {};
  } catch {
    return {};
  }
}

export const SEM_CACHE = { "Cache-Control": "no-store" };
