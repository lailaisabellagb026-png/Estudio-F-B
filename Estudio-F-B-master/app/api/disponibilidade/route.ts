import { NextResponse, type NextRequest } from "next/server";
import { dataValida } from "@/lib/horariosAtendimento";
import { ocupadosNaData } from "@/lib/server/agendamentos";
import { ErroDeNegocio, responderErro, SEM_CACHE } from "@/lib/server/http";

/** GET /api/disponibilidade?data=AAAA-MM-DD — faixas já reservadas no dia, sem dados das clientes. */
export async function GET(request: NextRequest) {
  try {
    const data = request.nextUrl.searchParams.get("data");
    if (!dataValida(data)) throw new ErroDeNegocio("Data inválida.");
    const ocupados = await ocupadosNaData(data);
    return NextResponse.json({ data, ocupados }, { headers: SEM_CACHE });
  } catch (erro) {
    return responderErro(erro);
  }
}
