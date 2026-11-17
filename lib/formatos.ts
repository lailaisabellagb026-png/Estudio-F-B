const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** R$ 1.250,00 */
export function formatarPreco(valor: number) {
  return moeda.format(valor);
}

/** R$ 90 (sem centavos quando o valor é redondo), ou "sob consulta" para zero. */
export function formatarPrecoCurto(valor: number) {
  if (valor === 0) return "sob consulta";
  return Number.isInteger(valor) ? `R$ ${valor.toLocaleString("pt-BR")}` : formatarPreco(valor);
}

/** Lê "1.250,50", "R$ 80" ou "80.5" e devolve o número, ou NaN. */
export function lerPreco(texto: string) {
  const limpo = texto.replace(/[R$\s]/g, "");
  if (!limpo) return Number.NaN;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  return /^\d+(\.\d{1,2})?$/.test(normalizado) ? Number(normalizado) : Number.NaN;
}

/** 45min, 1h, 1h30 */
export function formatarDuracao(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** Máscara (11) 99999-9999 enquanto a pessoa digita. */
export function formatarTelefone(valor: string) {
  const numeros = somenteDigitos(valor).slice(0, 11);
  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

export function telefoneValido(valor: string) {
  const numeros = somenteDigitos(valor);
  return numeros.length === 10 || numeros.length === 11;
}

/** Link de conversa no WhatsApp. Aceita número com ou sem o 55. */
export function linkWhatsApp(telefone: string, mensagem?: string) {
  const numeros = somenteDigitos(telefone);
  const comPais = numeros.length <= 11 ? `55${numeros}` : numeros;
  return `https://wa.me/${comPais}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

function dataUTC(dataISO: string) {
  return new Date(`${dataISO}T12:00:00Z`);
}

/** Terça-feira, 6 de outubro */
export function formatarDataLonga(dataISO: string) {
  const texto = dataUTC(dataISO).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** 06/10 */
export function formatarDataCurta(dataISO: string) {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

/** 06/10/2026 */
export function formatarDataCompleta(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** { semana: "ter", dia: 6, mes: "out" } para os botões de data. */
export function partesDaData(dataISO: string) {
  const data = dataUTC(dataISO);
  return {
    semana: data.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", ""),
    dia: data.getUTCDate(),
    mes: data.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", ""),
  };
}

export function plural(quantidade: number, singular: string, pluralTexto = `${singular}s`) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}
