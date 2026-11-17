import type { Metadata } from "next";
import { Financeiro } from "./Financeiro";

export const metadata: Metadata = { title: "Financeiro" };

export default function PaginaFinanceiro() {
  return <Financeiro />;
}
