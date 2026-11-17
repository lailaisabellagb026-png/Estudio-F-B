import type { Metadata } from "next";
import { MeuHorario } from "./MeuHorario";

export const metadata: Metadata = {
  title: "Meu horário",
  description: "Veja ou cancele os horários marcados no Estúdio de Beleza F&B.",
};

export default function PaginaMeuHorario() {
  return <MeuHorario />;
}
