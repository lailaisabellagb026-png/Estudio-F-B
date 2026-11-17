import type { Metadata } from "next";
import { carregarConfiguracaoParaPagina } from "@/lib/server/config";
import { Calendario } from "./Calendario";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Calendário" };

export default async function PaginaCalendario() {
  const { servicos, horarios } = await carregarConfiguracaoParaPagina();
  return <Calendario servicos={servicos} horarios={horarios} />;
}
