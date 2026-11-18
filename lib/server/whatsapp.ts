import "server-only";

/**
 * Avisos no WhatsApp do estúdio pela API gratuita do CallMeBot.
 * O CallMeBot só envia mensagens para o número que ativou a chave, por isso
 * os avisos vão para o estúdio (e não para as clientes).
 */
const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";

// Número que recebe os avisos (DDI + DDD + número). Pode ser trocado pela
// variável CALLMEBOT_PHONE sem mexer no código.
const NUMERO_PADRAO = "5511976847027";

export async function avisarEstudio(mensagem: string): Promise<boolean> {
  const apikey = process.env.CALLMEBOT_APIKEY?.trim();
  const telefone = process.env.CALLMEBOT_PHONE?.trim() || NUMERO_PADRAO;

  if (!apikey) {
    console.warn("WhatsApp não enviado: configure CALLMEBOT_APIKEY.");
    return false;
  }

  const url =
    `${CALLMEBOT_URL}?phone=${encodeURIComponent(telefone)}` +
    `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    // O CallMeBot usa outros códigos (203, 401, 403...) para chave errada ou bloqueio.
    if (resposta.status !== 200) {
      const texto = await resposta.text().catch(() => "");
      console.error("CallMeBot recusou a mensagem:", resposta.status, texto.replace(/<[^>]+>/g, " ").trim().slice(0, 300));
      return false;
    }
    return true;
  } catch (erro) {
    console.error("Falha ao chamar o CallMeBot:", erro);
    return false;
  }
}
