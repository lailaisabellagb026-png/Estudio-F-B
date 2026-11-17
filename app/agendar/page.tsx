import type { Metadata } from "next";
import { carregarConfiguracaoParaPagina } from "@/lib/server/config";
import { FluxoAgendamento } from "./FluxoAgendamento";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agendar horário",
};

export default async function PaginaAgendar() {
  const { servicos, horarios } = await carregarConfiguracaoParaPagina();
  return <FluxoAgendamento servicos={servicos.filter((servico) => servico.ativo)} horarios={horarios} />;
}
