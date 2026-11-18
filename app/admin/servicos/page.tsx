import type { Metadata } from "next";
import { carregarConfiguracaoParaPagina } from "@/lib/server/config";
import { EditorEstudio } from "./EditorEstudio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Serviços e horários" };

export default async function PaginaServicos() {
  const { servicos, categorias, horarios } = await carregarConfiguracaoParaPagina();
  return <EditorEstudio servicosIniciais={servicos} categoriasIniciais={categorias} horariosIniciais={horarios} />;
}
