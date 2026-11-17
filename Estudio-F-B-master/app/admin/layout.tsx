import type { Metadata } from "next";
import { MarcaFB } from "@/components/MarcaFB";
import { firebaseConfigurado } from "@/lib/server/painel";
import { CascaPainel } from "./CascaPainel";

export const metadata: Metadata = {
  title: { default: "Painel do estúdio", template: "%s · Painel F&B" },
  robots: { index: false, follow: false },
};

// O painel não tem senha: quem tiver o endereço /admin consegue abrir.
export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  if (!firebaseConfigurado()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <MarcaFB />
        <h1 className="mt-6 font-display text-4xl">Painel ainda não configurado</h1>
        <p className="mt-3 text-cinza">
          Falta a variável <code className="rounded bg-carvao-2 px-1.5 py-0.5 text-giz">FIREBASE_SERVICE_ACCOUNT</code>. Cadastre em
          Vercel → Settings → Environment Variables e faça um novo deploy.
        </p>
      </main>
    );
  }

  return <CascaPainel>{children}</CascaPainel>;
}
