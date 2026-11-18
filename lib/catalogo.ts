/** Categorias iniciais do catálogo; o estúdio pode criar, renomear e apagar em /admin/servicos. */
export const CATEGORIAS_PADRAO = [
  "Cortes",
  "Coloração e química",
  "Tratamentos",
  "Escova e finalização",
];

export type Categoria = string;

export interface Servico {
  id: string;
  nome: string;
  categoria: Categoria;
  /** Valor em reais. Zero aparece como "sob consulta". */
  preco: number;
  /** O preço final depende do comprimento/volume do cabelo. */
  aPartirDe: boolean;
  duracaoMin: number;
  ativo: boolean;
}

// Catálogo inicial, usado até o estúdio salvar o próprio em /admin/servicos.
export const SERVICOS_PADRAO: Servico[] = [
  { id: "corte-feminino", nome: "Corte feminino", categoria: "Cortes", preco: 90, aPartirDe: true, duracaoMin: 60, ativo: true },
  { id: "corte-masculino", nome: "Corte masculino", categoria: "Cortes", preco: 50, aPartirDe: false, duracaoMin: 40, ativo: true },
  { id: "corte-infantil", nome: "Corte infantil", categoria: "Cortes", preco: 45, aPartirDe: false, duracaoMin: 30, ativo: true },
  { id: "barba", nome: "Barba", categoria: "Cortes", preco: 40, aPartirDe: false, duracaoMin: 30, ativo: true },
  { id: "coloracao", nome: "Coloração", categoria: "Coloração e química", preco: 150, aPartirDe: true, duracaoMin: 120, ativo: true },
  { id: "retoque-de-raiz", nome: "Retoque de raiz", categoria: "Coloração e química", preco: 110, aPartirDe: false, duracaoMin: 90, ativo: true },
  { id: "mechas", nome: "Mechas e luzes", categoria: "Coloração e química", preco: 300, aPartirDe: true, duracaoMin: 240, ativo: true },
  { id: "progressiva", nome: "Progressiva", categoria: "Coloração e química", preco: 250, aPartirDe: true, duracaoMin: 180, ativo: true },
  { id: "hidratacao", nome: "Hidratação", categoria: "Tratamentos", preco: 80, aPartirDe: false, duracaoMin: 60, ativo: true },
  { id: "reconstrucao", nome: "Reconstrução", categoria: "Tratamentos", preco: 120, aPartirDe: false, duracaoMin: 60, ativo: true },
  { id: "botox-capilar", nome: "Botox capilar", categoria: "Tratamentos", preco: 180, aPartirDe: true, duracaoMin: 120, ativo: true },
  { id: "escova", nome: "Escova", categoria: "Escova e finalização", preco: 60, aPartirDe: true, duracaoMin: 45, ativo: true },
  { id: "penteado", nome: "Penteado", categoria: "Escova e finalização", preco: 150, aPartirDe: true, duracaoMin: 90, ativo: true },
];

export const LIMITES_SERVICO = {
  nome: 60,
  categoria: 40,
  categoriasMax: 30,
  precoMax: 20000,
  duracaoMin: 5,
  duracaoMax: 600,
};

function slug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "servico"
  );
}

export function novoIdServico(nome: string, existentes: Iterable<string>) {
  const usados = new Set(existentes);
  const base = slug(nome);
  let id = base;
  for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

function lerCategoria(valor: unknown): Categoria {
  return typeof valor === "string" ? valor.trim().slice(0, LIMITES_SERVICO.categoria) : "";
}

/** Lê um serviço vindo do banco ou do painel; devolve null se estiver inválido. */
function lerServico(bruto: unknown, idsUsados: Set<string>): Servico | null {
  if (!bruto || typeof bruto !== "object") return null;
  const item = bruto as Partial<Servico>;
  const nome = typeof item.nome === "string" ? item.nome.trim().slice(0, LIMITES_SERVICO.nome) : "";
  const preco = Number(item.preco);
  const duracaoMin = Number(item.duracaoMin);
  if (
    !nome ||
    !Number.isFinite(preco) || preco < 0 || preco > LIMITES_SERVICO.precoMax ||
    !Number.isInteger(duracaoMin) || duracaoMin < LIMITES_SERVICO.duracaoMin || duracaoMin > LIMITES_SERVICO.duracaoMax
  ) return null;

  const id = typeof item.id === "string" && item.id && !idsUsados.has(item.id) ? item.id : novoIdServico(nome, idsUsados);
  idsUsados.add(id);
  return {
    id,
    nome,
    categoria: lerCategoria(item.categoria) || CATEGORIAS_PADRAO[0],
    preco: Math.round(preco * 100) / 100,
    aPartirDe: item.aPartirDe === true,
    duracaoMin,
    ativo: item.ativo !== false,
  };
}

/** Converte o que veio do banco num catálogo válido. Sem catálogo salvo, usa o padrão. */
export function normalizarCatalogo(valor: unknown): Servico[] {
  if (!Array.isArray(valor)) return SERVICOS_PADRAO;
  const ids = new Set<string>();
  const servicos = valor.map((item) => lerServico(item, ids)).filter((item): item is Servico => item !== null);
  return servicos.length > 0 ? servicos : SERVICOS_PADRAO;
}

/** Lê o catálogo enviado pelo painel sem descartar nada: qualquer item inválido vira null. */
export function lerCatalogoEnviado(valor: unknown): Servico[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 200) return null;
  const ids = new Set<string>();
  const servicos = valor.map((item) => lerServico(item, ids));
  return servicos.every((item): item is Servico => item !== null) ? servicos : null;
}

/** Problema que impede salvar o catálogo, ou null se estiver tudo certo. */
export function problemaNoCatalogo(servicos: Servico[]): string | null {
  if (servicos.length === 0) return "Mantenha pelo menos um serviço no catálogo.";
  if (!servicos.some((servico) => servico.ativo)) return "Deixe pelo menos um serviço visível para as clientes.";
  const nomes = new Set<string>();
  for (const servico of servicos) {
    const nome = servico.nome.trim();
    if (!nome) return "Todo serviço precisa de um nome.";
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (nomes.has(chave)) return `O nome "${nome}" aparece duas vezes. Use nomes diferentes.`;
    nomes.add(chave);
    if (!Number.isFinite(servico.preco) || servico.preco < 0) return `Confira o preço de "${nome}".`;
    if (
      !Number.isInteger(servico.duracaoMin) ||
      servico.duracaoMin < LIMITES_SERVICO.duracaoMin ||
      servico.duracaoMin > LIMITES_SERVICO.duracaoMax
    ) return `A duração de "${nome}" precisa ficar entre 5 minutos e 10 horas.`;
  }
  return null;
}

/**
 * Lista de categorias salva no painel. Categorias usadas por algum serviço
 * e que faltem na lista entram no fim, para nenhum serviço sumir.
 */
export function normalizarCategorias(valor: unknown, servicos: Servico[]): Categoria[] {
  const lista: unknown[] = Array.isArray(valor) ? valor : CATEGORIAS_PADRAO;
  const vistas = new Set<string>();
  const categorias: Categoria[] = [];
  for (const item of [...lista, ...servicos.map((servico) => servico.categoria)]) {
    const nome = lerCategoria(item);
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!nome || vistas.has(chave)) continue;
    vistas.add(chave);
    categorias.push(nome);
  }
  return categorias.length > 0 ? categorias : [...CATEGORIAS_PADRAO];
}

/** Lê as categorias enviadas pelo painel; null se alguma estiver inválida. */
export function lerCategoriasEnviadas(valor: unknown): Categoria[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > LIMITES_SERVICO.categoriasMax) return null;
  const categorias = valor.map(lerCategoria);
  return categorias.every(Boolean) ? categorias : null;
}

/** Problema que impede salvar as categorias, ou null se estiver tudo certo. */
export function problemaNasCategorias(categorias: Categoria[], servicos: Servico[]): string | null {
  if (categorias.length === 0) return "Mantenha pelo menos uma categoria.";
  const nomes = new Set<string>();
  for (const categoria of categorias) {
    const nome = categoria.trim();
    if (!nome) return "Toda categoria precisa de um nome.";
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (nomes.has(chave)) return `A categoria "${nome}" aparece duas vezes. Use nomes diferentes.`;
    nomes.add(chave);
  }
  const semCategoria = servicos.find((servico) => !categorias.includes(servico.categoria));
  if (semCategoria) return `Escolha uma categoria para "${semCategoria.nome}".`;
  return null;
}

/** Deixa os serviços na ordem das categorias, mantendo a ordem dentro de cada uma. */
export function ordenarPorCategoria(servicos: Servico[], categorias: Categoria[]) {
  const posicao = (servico: Servico) => {
    const indice = categorias.indexOf(servico.categoria);
    return indice < 0 ? categorias.length : indice;
  };
  return servicos
    .map((servico, i) => ({ servico, i }))
    .sort((a, b) => posicao(a.servico) - posicao(b.servico) || a.i - b.i)
    .map(({ servico }) => servico);
}

/** Agrupa na ordem em que as categorias aparecem (o catálogo é salvo já ordenado). */
export function agruparPorCategoria(servicos: Servico[]) {
  const grupos = new Map<Categoria, Servico[]>();
  for (const servico of servicos) {
    const lista = grupos.get(servico.categoria) ?? [];
    lista.push(servico);
    grupos.set(servico.categoria, lista);
  }
  return [...grupos].map(([categoria, lista]) => ({ categoria, servicos: lista }));
}
