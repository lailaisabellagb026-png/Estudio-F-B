import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rodarRotinaDoEstudio } from "@/lib/server/lembretes";
import { responderErro } from "@/lib/server/http";

export const maxDuration = 60;

function chaveConfere(recebida: string, esperada: string) {
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/lembretes — chamado pelo cron-job.org (de preferência a cada 30 minutos).
 * Envia os lembretes ao estúdio e conclui horários de dias anteriores.
 * A chave vai no cabeçalho "Authorization: Bearer <CRON_SECRET>" ou em ?chave=<CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const esperada = process.env.CRON_SECRET?.trim();
  if (!esperada) {
    return NextResponse.json({ erro: "Configure CRON_SECRET para ativar os lembretes." }, { status: 503 });
  }

  const cabecalho = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const recebida = cabecalho || request.nextUrl.searchParams.get("chave") || "";
  if (!chaveConfere(recebida, esperada)) {
    return NextResponse.json({ erro: "Chave do cron incorreta." }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await rodarRotinaDoEstudio()) });
  } catch (erro) {
    return responderErro(erro);
  }
}
