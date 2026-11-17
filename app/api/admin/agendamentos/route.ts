import { NextResponse, type NextRequest } from "next/server";
import { dataValida, diasEntre } from "@/lib/horariosAtendimento";
import type { DadosAgendamento } from "@/lib/tipos";
import { concluirDiasAnteriores, criarAgendamento, listarAgendamentos } from "@/lib/server/agendamentos";
import { ErroDeNegocio, lerCorpo, responderErro, SEM_CACHE } from "@/lib/server/http";

// Fecha os horários em aberto de dias anteriores no máximo a cada 30 minutos,
// mesmo antes de o cron estar configurado.
let ultimaArrumacao = 0;

/** GET /api/admin/agendamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD */
export async function GET(request: NextRequest) {
  try {
    const de = request.nextUrl.searchParams.get("de");
    const ate = request.nextUrl.searchParams.get("ate");
    if (!dataValida(de) || !dataValida(ate) || de > ate) throw new ErroDeNegocio("Período inválido.");
    if (diasEntre(de, ate) > 400) throw new ErroDeNegocio("Escolha um período de até 400 dias.");

    if (Date.now() - ultimaArrumacao > 30 * 60 * 1000) {
      ultimaArrumacao = Date.now();
      await concluirDiasAnteriores();
    }

    const agendamentos = await listarAgendamentos(de, ate);
    return NextResponse.json({ agendamentos }, { headers: SEM_CACHE });
  } catch (erro) {
    return responderErro(erro);
  }
}

/** POST /api/admin/agendamentos — horário marcado pelo próprio estúdio. */
export async function POST(request: Request) {
  try {
    const corpo = await lerCorpo<DadosAgendamento>(request);
    const agendamento = await criarAgendamento(corpo, "estudio");
    return NextResponse.json({ agendamento }, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
