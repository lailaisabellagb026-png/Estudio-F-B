// Dados do estúdio que aparecem no site. Endereço, mapa e Instagram só são
// exibidos depois de preenchidos.
export const ESTUDIO = {
  nome: "Estúdio de Beleza F&B",
  // WhatsApp do botão "Fale com o estúdio": DDI 55 + DDD + número.
  whatsapp: "5511976847027",
  // Ex.: "Rua das Palmeiras, 120 — Vila Mariana, São Paulo/SP"
  endereco: "",
  // Link "compartilhar" do Google Maps.
  linkMapa: "",
  // Usuário do Instagram, sem o @.
  instagram: "",
};

// Endereço público do site, usado nos links das mensagens de WhatsApp e nas
// prévias de compartilhamento. Na Vercel é detectado sozinho.
export function urlDoSite(): URL {
  const configurada = process.env.SITE_URL?.trim();
  if (configurada) return new URL(configurada);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}
