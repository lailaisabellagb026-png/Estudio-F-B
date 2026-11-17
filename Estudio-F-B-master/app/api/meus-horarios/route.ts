import { NextResponse } from "next/server";
import { horariosDaCliente } from "@/lib/server/agendamentos";
import { lerCorpo, responderErro, SEM_CACHE } from "@/lib/server/http";

/** POST /api/meus-horarios — próximos horários de um WhatsApp. O número vai no corpo, fora da URL. */
export async function POST(request: Request) {
  try {
    const { telefone } = await lerCorpo<{ telefone: string }>(request);
    const agendamentos = await horariosDaCliente(String(telefone ?? ""));
    return NextResponse.json({ agendamentos }, { headers: SEM_CACHE });
  } catch (erro) {
    return responderErro(erro);
  }
}
