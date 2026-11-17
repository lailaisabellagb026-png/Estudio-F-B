import { after, NextResponse } from "next/server";
import { urlDoSite } from "@/lib/estudio";
import { avisoNovoAgendamento } from "@/lib/mensagens";
import type { DadosAgendamento } from "@/lib/tipos";
import { criarAgendamento, paraCliente } from "@/lib/server/agendamentos";
import { lerCorpo, responderErro } from "@/lib/server/http";
import { avisarEstudio } from "@/lib/server/whatsapp";

/** POST /api/agendamentos — agendamento feito pela cliente no site. */
export async function POST(request: Request) {
  try {
    const corpo = await lerCorpo<DadosAgendamento & { site: string }>(request);

    // Campo invisível para pessoas: só robôs de spam preenchem.
    if (corpo.site) return NextResponse.json({ erro: "Não foi possível agendar." }, { status: 400 });

    const agendamento = await criarAgendamento(corpo, "site");

    // O aviso no WhatsApp do estúdio sai depois da resposta, sem fazer a cliente esperar.
    after(() => avisarEstudio(avisoNovoAgendamento(agendamento, new URL("/admin", urlDoSite()).toString())));

    return NextResponse.json({ agendamento: paraCliente(agendamento) }, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}
