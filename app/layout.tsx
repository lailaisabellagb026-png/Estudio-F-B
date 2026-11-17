import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda } from "next/font/google";
import { ESTUDIO, urlDoSite } from "@/lib/estudio";
import "./globals.css";

// Bodoni para títulos (o mesmo desenho de alto contraste do "F&B" da logo)
// e Archivo para o texto, com o eixo de largura para os rótulos condensados.
const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--fonte-display",
});

const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--fonte-sans",
});

export const metadata: Metadata = {
  metadataBase: urlDoSite(),
  title: {
    default: `${ESTUDIO.nome} · Agende seu horário`,
    template: `%s · ${ESTUDIO.nome}`,
  },
  description:
    "Cortes, coloração e tratamentos com hora marcada. Escolha o dia, os serviços e um horário livre no Estúdio de Beleza F&B.",
  openGraph: {
    title: ESTUDIO.nome,
    description: "Agende seu horário online: escolha o dia, os serviços e um horário livre.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F4F2",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
