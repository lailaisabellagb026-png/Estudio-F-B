import { NextResponse } from "next/server";
import {
  lerCatalogoEnviado,
  lerCategoriasEnviadas,
  ordenarPorCategoria,
  problemaNasCategorias,
  problemaNoCatalogo,
} from "@/lib/catalogo";
import { normalizarConfiguracaoHorarios, problemaNoExpediente, type ConfiguracaoHorarios } from "@/lib/horariosAtendimento";
import { salvarHorarios, salvarServicos } from "@/lib/server/config";
import { ErroDeNegocio, lerCorpo, responderErro } from "@/lib/server/http";

/** PUT /api/admin/configuracoes — salva o catálogo ({ servicos, categorias }) ou o expediente ({ horarios }). */
export async function PUT(request: Request) {
  try {
    const corpo = await lerCorpo<{ servicos: unknown; categorias: unknown; horarios: Partial<ConfiguracaoHorarios> }>(request);

    if (corpo.servicos !== undefined) {
      const servicos = lerCatalogoEnviado(corpo.servicos);
      if (!servicos) throw new ErroDeNegocio("Revise os serviços: cada um precisa de nome, preço e duração.");
      const categorias = lerCategoriasEnviadas(corpo.categorias);
      if (!categorias) throw new ErroDeNegocio("Revise as categorias: cada uma precisa de um nome.");
      const problema = problemaNasCategorias(categorias, servicos) ?? problemaNoCatalogo(servicos);
      if (problema) throw new ErroDeNegocio(problema);
      const ordenados = ordenarPorCategoria(servicos, categorias);
      await salvarServicos(ordenados, categorias);
      return NextResponse.json({ servicos: ordenados, categorias });
    }

    if (corpo.horarios !== undefined) {
      const enviados = corpo.horarios;
      // A normalização fecharia em silêncio um dia com abertura depois do fechamento.
      const diaInvertido = Object.values(enviados.semana ?? {}).some(
        (dia) => dia?.ativo && typeof dia.inicio === "string" && typeof dia.fim === "string" && dia.inicio >= dia.fim,
      );
      if (diaInvertido) throw new ErroDeNegocio("Em cada dia aberto, a abertura precisa ser antes do fechamento.");
      const horarios = normalizarConfiguracaoHorarios(enviados);
      const descartouAlgo =
        horarios.periodosEspeciais.length !== (Array.isArray(enviados.periodosEspeciais) ? enviados.periodosEspeciais.length : 0) ||
        horarios.folgas.length !== (Array.isArray(enviados.folgas) ? enviados.folgas.length : 0);
      const problema = problemaNoExpediente(horarios);
      if (problema || descartouAlgo) throw new ErroDeNegocio(problema ?? "Revise as datas dos horários especiais e das folgas.");
      await salvarHorarios(horarios);
      return NextResponse.json({ horarios });
    }

    throw new ErroDeNegocio("Nada para salvar.");
  } catch (erro) {
    return responderErro(erro);
  }
}
