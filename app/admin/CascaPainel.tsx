"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAgenda, IconeCalendario, IconeFinanceiro, IconeTesoura } from "@/components/Icones";
import { MarcaFB } from "@/components/MarcaFB";

const ITENS = [
  { href: "/admin", rotulo: "Agenda", Icone: IconeAgenda },
  { href: "/admin/calendario", rotulo: "Calendário", Icone: IconeCalendario },
  { href: "/admin/servicos", rotulo: "Serviços", Icone: IconeTesoura },
  { href: "/admin/financeiro", rotulo: "Financeiro", Icone: IconeFinanceiro },
];

export function CascaPainel({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/admin" ? caminho === href : caminho.startsWith(href));

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-linha bg-tinta/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-5 px-5">
          <MarcaFB href="/admin" />
          <span className="rotulo hidden text-cinza sm:inline">Painel do estúdio</span>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Seções do painel">
            {ITENS.map(({ href, rotulo }) => (
              <Link
                key={href}
                href={href}
                aria-current={ativo(href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  ativo(href) ? "bg-carvao-2 font-medium text-giz" : "text-cinza hover:text-giz"
                }`}
              >
                {rotulo}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm md:ml-2">
            <Link href="/" target="_blank" className="text-cinza transition-colors hover:text-giz">
              Ver site
            </Link>
          </div>
        </div>
      </header>

      {children}

      <nav
        aria-label="Seções do painel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-tinta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {ITENS.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                ativo(href) ? "text-giz" : "text-cinza"
              }`}
            >
              {ativo(href) && <span className="absolute inset-x-6 top-0 h-0.5 bg-vermelho-vivo" />}
              <Icone className="h-5 w-5" />
              {rotulo}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
