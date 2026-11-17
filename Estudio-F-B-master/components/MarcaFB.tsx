import Link from "next/link";

/** Monograma F&B em texto, para cabeçalhos. A logo completa fica na página inicial. */
export function MarcaFB({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Estúdio de Beleza F&B, página inicial"
      className={`font-display text-[1.6rem] font-semibold italic leading-none tracking-tight text-vermelho-vivo ${className}`}
    >
      F&amp;B
    </Link>
  );
}
