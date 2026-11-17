import { NextResponse, type NextRequest } from "next/server";
import type { DadosAgendamento } from "@/lib/tipos";
import { alterarPeloEstudio, excluirAgendamento, type AcaoDoEstudio } from "@/lib/server/agendamentos";
import { ErroDeNegocio, lerCorpo, responderErro } from "@/lib/server/http";

function lerAcao(corpo: Record<string, unknown>): AcaoDoEstudio {
  switch (corpo.acao) {
    case "confirmar":
    case "cancelar":
    case "reabrir":
      return { acao: corpo.acao };
    case "concluir":
      return { acao: "concluir", valorCobrado: Number(corpo.valorCobrado) };
    case "editar":
      return { acao: "editar", dados: (corpo.dados ?? {}) as Partial<DadosAgendamento> };
    default:
      throw new ErroDeNegocio("Ação desconhecida.");
  }
}

/** PATCH /api/admin/agendamentos/:id — confirmar, concluir, cancelar, reabrir ou editar. */
export async function PATCH(request: NextRequest, contexto: RouteContext<"/api/admin/agendamentos/[id]">) {
  try {
    const { id } = await contexto.params;
    const agendamento = await alterarPeloEstudio(id, lerAcao(await lerCorpo(request)));
    return NextResponse.json({ agendamento });
  } catch (erro) {
    return responderErro(erro);
  }
}

/** DELETE /api/admin/agendamentos/:id — apaga o registro de vez. */
export async function DELETE(_request: NextRequest, contexto: RouteContext<"/api/admin/agendamentos/[id]">) {
  try {
    const { id } = await contexto.params;
    await excluirAgendamento(id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErro(erro);
  }
}
