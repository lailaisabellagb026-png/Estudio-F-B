import { after, NextResponse } from "next/server";
import { avisoCancelamento } from "@/lib/mensagens";
import { cancelarPelaCliente } from "@/lib/server/agendamentos";
import { ErroDeNegocio, lerCorpo, responderErro } from "@/lib/server/http";
import { avisarEstudio } from "@/lib/server/whatsapp";

/** POST /api/cancelar — a cliente cancela informando o mesmo WhatsApp do agendamento. */
export async function POST(request: Request) {
  try {
    const { id, telefone } = await lerCorpo<{ id: string; telefone: string }>(request);
    if (typeof id !== "string" || !id || id.includes("/")) throw new ErroDeNegocio("Horário não encontrado.", 404);

    const agendamento = await cancelarPelaCliente(id, String(telefone ?? ""));
    after(() => avisarEstudio(avisoCancelamento(agendamento)));

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErro(erro);
  }
}
