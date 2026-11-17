import Image from "next/image";
import Link from "next/link";
import { IconeSeta, IconeWhatsApp } from "@/components/Icones";
import { MarcaFB } from "@/components/MarcaFB";
import { agruparPorCategoria } from "@/lib/catalogo";
import { ESTUDIO } from "@/lib/estudio";
import { formatarDataCurta, formatarDuracao, formatarPrecoCurto, formatarTelefone, linkWhatsApp } from "@/lib/formatos";
import {
  diaDaSemana,
  NOMES_DIAS,
  obterExpediente,
  resumoDiasAbertos,
  resumoHorario,
  somarDias,
  type DiaSemana,
} from "@/lib/horariosAtendimento";
import { carregarConfiguracaoParaPagina } from "@/lib/server/config";
import { agoraNoEstudio } from "@/lib/tempo";
import logo from "@/public/logo-site.jpg";

// Catálogo e horários vêm do painel, então a página é montada a cada visita.
export const dynamic = "force-dynamic";

const ORDEM_DA_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

export default async function Inicio() {
  const { servicos, horarios } = await carregarConfiguracaoParaPagina();
  const grupos = agruparPorCategoria(servicos.filter((servico) => servico.ativo));
  const temPrecoAPartirDe = servicos.some((servico) => servico.ativo && servico.aPartirDe);

  const hoje = agoraNoEstudio().data;
  const diaDeHoje = diaDaSemana(hoje);
  const expedienteDeHoje = obterExpediente(hoje, horarios);
  const proximasFolgas = horarios.folgas.filter((folga) => folga.fim >= hoje && folga.inicio <= somarDias(hoje, 45));
  const resumo = [resumoDiasAbertos(horarios), resumoHorario(horarios)].filter(Boolean).join(" · ");

  return (
    <main>
      {/* ── Abertura ── */}
      <section className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <MarcaFB />
          <nav className="flex items-center gap-5 text-sm text-cinza sm:gap-7">
            <a href="#precos" className="hidden transition-colors hover:text-giz sm:inline">Preços</a>
            <a href="#horarios" className="hidden transition-colors hover:text-giz sm:inline">Horários</a>
            <Link href="/meu-horario" className="font-medium text-giz transition-colors hover:text-vermelho-vivo">
              Meu horário
            </Link>
          </nav>
        </header>

        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-28 text-center sm:pb-36">
          {/* "multiply" faz o branco da imagem sumir no fundo creme da página. */}
          <Image
            src={logo}
            alt="Estúdio de Beleza F&B"
            priority
            placeholder="blur"
            sizes="(max-width: 640px) 88vw, 480px"
            className="surgir w-[min(88vw,480px)] mix-blend-multiply"
          />

          <h1 className="surgir mt-6 font-display text-[clamp(2.5rem,10.5vw,5.2rem)] font-medium leading-[1.02] tracking-[-0.01em] [--atraso:0.2s]">
            Seu horário
            <br />
            com <em className="italic text-vermelho">praticidade.</em>
          </h1>

          <p className="surgir mt-7 max-w-md text-[17px] leading-relaxed text-cinza [--atraso:0.35s]">
            Escolha o dia, os serviços e o horário pelo celular, em menos de um minuto. O estúdio confirma com você pelo WhatsApp.
          </p>

          <div className="surgir mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center [--atraso:0.45s]">
            <Link href="/agendar" className="botao-vermelho h-14 px-8 text-base">
              Agendar horário
              <IconeSeta />
            </Link>
            <Link href="/meu-horario" className="botao-contorno h-14 px-7">
              Ver ou cancelar meu horário
            </Link>
          </div>

          {resumo && <p className="rotulo surgir mt-8 text-cinza [--atraso:0.55s]">{resumo}</p>}
        </div>
      </section>

      {/* ── Tabela de preços, no papel ── */}
      <section
        id="precos"
        className="-mt-12 scroll-mt-4 bg-carvao text-giz [clip-path:polygon(0_3rem,100%_0,100%_100%,0_100%)] sm:-mt-16 sm:[clip-path:polygon(0_4.5rem,100%_0,100%_100%,0_100%)]"
      >
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-24 sm:px-8 sm:pt-32">
          <p className="rotulo text-vermelho">Tabela de preços</p>
          <h2 className="mt-2 font-display text-[2.6rem] font-medium leading-none sm:text-6xl">Serviços</h2>
          <p className="mt-4 max-w-lg text-cinza-papel">
            Dá para marcar mais de um serviço no mesmo horário. A duração e o total aparecem antes de confirmar.
          </p>

          <div className="mt-12 grid gap-x-16 gap-y-12 md:grid-cols-2">
            {grupos.map((grupo) => (
              <div key={grupo.categoria}>
                <h3 className="border-b border-giz/15 pb-3 font-display text-[1.65rem] italic">{grupo.categoria}</h3>
                <ul>
                  {grupo.servicos.map((servico) => (
                    <li key={servico.id} className="border-b border-giz/[0.07] py-3.5">
                      <div className="flex items-baseline text-[17px]">
                        <span className="font-medium">{servico.nome}</span>
                        <span className="guia" />
                        <span className="whitespace-nowrap tabular-nums">
                          {servico.aPartirDe && servico.preco > 0 && (
                            <span className="mr-1 text-xs text-cinza-papel">a partir de</span>
                          )}
                          {formatarPrecoCurto(servico.preco)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-cinza-papel">{formatarDuracao(servico.duracaoMin)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-6 border-t border-giz/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
            {temPrecoAPartirDe ? (
              <p className="max-w-md text-sm text-cinza-papel">
                Nos serviços “a partir de”, o valor final depende do comprimento e do volume do cabelo.
              </p>
            ) : (
              <span />
            )}
            <Link href="/agendar" className="botao-vermelho h-14 px-8 text-base">
              Agendar horário
              <IconeSeta />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Horários e contato ── */}
      <section id="horarios" className="mx-auto grid max-w-5xl scroll-mt-4 gap-16 px-5 py-20 sm:px-8 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="rotulo text-vermelho-vivo">Horário de funcionamento</p>
          <p className="mt-3 font-display text-3xl">
            {expedienteDeHoje.ativo ? (
              <>Hoje, das {expedienteDeHoje.inicio} às {expedienteDeHoje.fim}</>
            ) : (
              <>Hoje o estúdio está fechado</>
            )}
          </p>

          <ul className="mt-8">
            {ORDEM_DA_SEMANA.map((dia) => {
              const item = horarios.semana[dia];
              const ehHoje = dia === diaDeHoje;
              return (
                <li key={dia} className="flex items-baseline border-b border-linha py-3 text-[15px]">
                  <span className={ehHoje ? "font-semibold text-giz" : "text-cinza"}>
                    {NOMES_DIAS[dia]}
                    {ehHoje && <span className="rotulo ml-2 text-vermelho-vivo">hoje</span>}
                  </span>
                  <span className="guia text-cinza" />
                  <span className={`tabular-nums ${item.ativo ? "text-giz" : "text-cinza"}`}>
                    {item.ativo ? `${item.inicio} – ${item.fim}` : "Fechado"}
                  </span>
                </li>
              );
            })}
          </ul>

          {proximasFolgas.length > 0 && (
            <div className="mt-6 space-y-1 text-sm text-cinza">
              {proximasFolgas.map((folga) => (
                <p key={folga.id}>
                  <span className="text-vermelho-vivo">Fechado</span>{" "}
                  {folga.inicio === folga.fim
                    ? `em ${formatarDataCurta(folga.inicio)}`
                    : `de ${formatarDataCurta(folga.inicio)} a ${formatarDataCurta(folga.fim)}`}
                  {folga.motivo && ` · ${folga.motivo}`}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-1">
          <p className="rotulo text-vermelho-vivo">Fale com o estúdio</p>
          <a
            href={linkWhatsApp(ESTUDIO.whatsapp, "Olá! Vim pelo site do Estúdio F&B.")}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 flex items-center gap-4 border-b border-linha pb-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-linha text-giz transition-colors group-hover:border-vermelho-vivo group-hover:text-vermelho-vivo">
              <IconeWhatsApp />
            </span>
            <span>
              <span className="block text-sm text-cinza">WhatsApp</span>
              <span className="block text-lg tabular-nums">{formatarTelefone(ESTUDIO.whatsapp.slice(2))}</span>
            </span>
          </a>

          {ESTUDIO.instagram && (
            <a
              href={`https://instagram.com/${ESTUDIO.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block border-b border-linha pb-5"
            >
              <span className="block text-sm text-cinza">Instagram</span>
              <span className="block text-lg">@{ESTUDIO.instagram}</span>
            </a>
          )}

          {ESTUDIO.endereco && (
            <div className="mt-5 border-b border-linha pb-5">
              <span className="block text-sm text-cinza">Endereço</span>
              <span className="block text-lg leading-snug">{ESTUDIO.endereco}</span>
              {ESTUDIO.linkMapa && (
                <a
                  href={ESTUDIO.linkMapa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-vermelho-vivo"
                >
                  Abrir no mapa <IconeSeta className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-cinza sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {hoje.slice(0, 4)} {ESTUDIO.nome}
          </p>
        </div>
      </footer>
    </main>
  );
}
