import { carregarConfiguracaoParaPagina } from "@/lib/server/config";
import { Agenda } from "./Agenda";

export const dynamic = "force-dynamic";

export default async function PaginaAgenda() {
  const { servicos, horarios } = await carregarConfiguracaoParaPagina();
  return <Agenda servicos={servicos} horarios={horarios} />;
}
