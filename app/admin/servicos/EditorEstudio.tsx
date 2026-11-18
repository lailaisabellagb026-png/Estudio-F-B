"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconeFechar, IconeMais } from "@/components/Icones";
import { chamarApi } from "@/components/painel/api";
import { novoIdServico, problemaNasCategorias, problemaNoCatalogo, type Categoria, type Servico } from "@/lib/catalogo";
import { formatarDuracao, lerPreco } from "@/lib/formatos";
import {
  NOMES_DIAS,
  problemaNoExpediente,
  type ConfiguracaoHorarios,
  type DiaSemana,
  type Folga,
  type HorarioDia,
  type PeriodoEspecial,
} from "@/lib/horariosAtendimento";
import { agoraNoEstudio } from "@/lib/tempo";

const ORDEM_DA_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
const DURACOES = [15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480];

type LinhaServico = Omit<Servico, "categoria"> & { categoriaId: string; precoTexto: string };
type LinhaCategoria = { id: string; nome: string };
type Mensagem = { tipo: "ok" | "erro"; texto: string } | null;

function novoId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`;
}

function paraLinhas(servicos: Servico[], nomesCategorias: Categoria[]) {
  // Ids fixos pela posição: o servidor e o navegador precisam gerar os mesmos.
  const categorias: LinhaCategoria[] = nomesCategorias.map((nome, indice) => ({ id: `categoria-salva-${indice}`, nome }));
  const idDe = new Map(categorias.map((categoria) => [categoria.nome, categoria.id]));
  const linhas: LinhaServico[] = servicos.map(({ categoria, ...servico }) => {
    let categoriaId = idDe.get(categoria);
    if (!categoriaId) {
      categoriaId = `categoria-salva-${categorias.length}`;
      categorias.push({ id: categoriaId, nome: categoria });
      idDe.set(categoria, categoriaId);
    }
    return { ...servico, categoriaId, precoTexto: String(servico.preco).replace(".", ",") };
  });
  return { categorias, linhas };
}

export function EditorEstudio({
  servicosIniciais,
  categoriasIniciais,
  horariosIniciais,
}: {
  servicosIniciais: Servico[];
  categoriasIniciais: Categoria[];
  horariosIniciais: ConfiguracaoHorarios;
}) {
  const router = useRouter();

  // ── Expediente ──
  const [horarios, setHorarios] = useState(horariosIniciais);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [mensagemHorarios, setMensagemHorarios] = useState<Mensagem>(null);

  function mudarDia(dia: DiaSemana, mudanca: Partial<HorarioDia>) {
    setHorarios((atual) => ({ ...atual, semana: { ...atual.semana, [dia]: { ...atual.semana[dia], ...mudanca } } }));
    setMensagemHorarios(null);
  }

  function mudarFolga(id: string, mudanca: Partial<Folga>) {
    setHorarios((atual) => ({ ...atual, folgas: atual.folgas.map((item) => (item.id === id ? { ...item, ...mudanca } : item)) }));
    setMensagemHorarios(null);
  }

  function mudarPeriodo(id: string, mudanca: Partial<PeriodoEspecial>) {
    setHorarios((atual) => ({
      ...atual,
      periodosEspeciais: atual.periodosEspeciais.map((item) => (item.id === id ? { ...item, ...mudanca } : item)),
    }));
    setMensagemHorarios(null);
  }

  function adicionarFolga() {
    const hoje = agoraNoEstudio().data;
    setHorarios((atual) => ({ ...atual, folgas: [...atual.folgas, { id: novoId("folga"), inicio: hoje, fim: hoje, motivo: "" }] }));
  }

  function adicionarPeriodo() {
    const hoje = agoraNoEstudio().data;
    setHorarios((atual) => ({
      ...atual,
      periodosEspeciais: [
        ...atual.periodosEspeciais,
        { id: novoId("periodo"), inicio: hoje, fim: hoje, dias: [0], horaInicio: "09:00", horaFim: "18:00" },
      ],
    }));
  }

  async function salvarHorarios() {
    const problema = problemaNoExpediente(horarios);
    if (problema) {
      setMensagemHorarios({ tipo: "erro", texto: problema });
      return;
    }
    setSalvandoHorarios(true);
    setMensagemHorarios(null);
    try {
      await chamarApi("/api/admin/configuracoes", { metodo: "PUT", corpo: { horarios } });
      setMensagemHorarios({ tipo: "ok", texto: "Expediente salvo. O site já mostra os novos horários." });
      router.refresh();
    } catch (falha) {
      setMensagemHorarios({ tipo: "erro", texto: (falha as Error).message });
    } finally {
      setSalvandoHorarios(false);
    }
  }

  // ── Catálogo: categorias e serviços ──
  const [catalogo, setCatalogo] = useState(() => paraLinhas(servicosIniciais, categoriasIniciais));
  const { categorias, linhas: servicos } = catalogo;
  const [salvandoServicos, setSalvandoServicos] = useState(false);
  const [mensagemServicos, setMensagemServicos] = useState<Mensagem>(null);

  function setServicos(mudar: (atuais: LinhaServico[]) => LinhaServico[]) {
    setCatalogo((atual) => ({ ...atual, linhas: mudar(atual.linhas) }));
    setMensagemServicos(null);
  }

  function setCategorias(mudar: (atuais: LinhaCategoria[]) => LinhaCategoria[]) {
    setCatalogo((atual) => ({ ...atual, categorias: mudar(atual.categorias) }));
    setMensagemServicos(null);
  }

  function mudarServico(id: string, mudanca: Partial<LinhaServico>) {
    setServicos((atuais) => atuais.map((item) => (item.id === id ? { ...item, ...mudanca } : item)));
  }

  function adicionarServico(categoriaId: string) {
    setServicos((atuais) => [
      ...atuais,
      {
        id: novoIdServico("novo servico", atuais.map((item) => item.id)),
        nome: "",
        categoriaId,
        preco: 0,
        precoTexto: "",
        aPartirDe: false,
        duracaoMin: 60,
        ativo: true,
      },
    ]);
  }

  function adicionarCategoria() {
    setCategorias((atuais) => [...atuais, { id: novoId("categoria"), nome: "" }]);
  }

  function apagarCategoria(categoria: LinhaCategoria) {
    if (categorias.length <= 1) {
      setMensagemServicos({ tipo: "erro", texto: "Mantenha pelo menos uma categoria no catálogo." });
      return;
    }
    const quantos = servicos.filter((item) => item.categoriaId === categoria.id).length;
    const nome = categoria.nome.trim() || "sem nome";
    const quais = quantos === 1 ? "o serviço" : `os ${quantos} serviços`;
    if (quantos > 0 && !window.confirm(`Apagar a categoria "${nome}" e ${quais} dentro dela?`)) return;
    setCatalogo((atual) => ({
      categorias: atual.categorias.filter((item) => item.id !== categoria.id),
      linhas: atual.linhas.filter((item) => item.categoriaId !== categoria.id),
    }));
    setMensagemServicos({ tipo: "ok", texto: "Categoria removida. Clique em \u201cSalvar catálogo\u201d para confirmar." });
  }

  async function salvarServicos() {
    const nomeDa = new Map(categorias.map((categoria) => [categoria.id, categoria.nome.trim()]));
    const listaCategorias = categorias.map((categoria) => categoria.nome.trim());
    const lista: Servico[] = [];
    for (const { precoTexto, categoriaId, ...servico } of servicos) {
      const preco = lerPreco(precoTexto);
      if (!Number.isFinite(preco)) {
        setMensagemServicos({ tipo: "erro", texto: `Confira o preço de "${servico.nome || "serviço sem nome"}". Use, por exemplo, 80 ou 80,00.` });
        return;
      }
      lista.push({ ...servico, categoria: nomeDa.get(categoriaId) ?? "", nome: servico.nome.trim(), preco });
    }
    const problema = problemaNasCategorias(listaCategorias, lista) ?? problemaNoCatalogo(lista);
    if (problema) {
      setMensagemServicos({ tipo: "erro", texto: problema });
      return;
    }
    setSalvandoServicos(true);
    setMensagemServicos(null);
    try {
      const resposta = await chamarApi<{ servicos: Servico[]; categorias: Categoria[] }>("/api/admin/configuracoes", {
        metodo: "PUT",
        corpo: { servicos: lista, categorias: listaCategorias },
      });
      setCatalogo(paraLinhas(resposta.servicos, resposta.categorias));
      setMensagemServicos({ tipo: "ok", texto: "Catálogo salvo. A tabela de preços e o agendamento já foram atualizados." });
      router.refresh();
    } catch (falha) {
      setMensagemServicos({ tipo: "erro", texto: (falha as Error).message });
    } finally {
      setSalvandoServicos(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-5 pb-6 pt-8">
      <div>
        <h1 className="font-display text-[2.4rem] font-medium leading-tight">Serviços e horários</h1>
        <p className="mt-1 text-cinza">O que você salvar aqui aparece na hora no site e no agendamento.</p>
      </div>

      {/* ── Expediente ── */}
      <Bloco titulo="Expediente" texto="Dias e horários de atendimento. Os horários para as clientes começam de 30 em 30 minutos.">
        <ul className="divide-y divide-linha">
          {ORDEM_DA_SEMANA.map((dia) => {
            const item = horarios.semana[dia];
            return (
              <li key={dia} className="flex flex-wrap items-center gap-3 py-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.ativo}
                  onClick={() => mudarDia(dia, { ativo: !item.ativo })}
                  className="flex w-36 items-center gap-3 text-left"
                >
                  <span className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${item.ativo ? "justify-end bg-vermelho" : "justify-start bg-carvao-2"}`}>
                    <span className="h-5 w-5 rounded-full bg-white shadow" />
                  </span>
                  <span className={item.ativo ? "font-medium" : "text-cinza"}>{NOMES_DIAS[dia]}</span>
                </button>
                {item.ativo ? (
                  <div className="flex items-center gap-2 text-sm text-cinza">
                    <input type="time" value={item.inicio} onChange={(e) => mudarDia(dia, { inicio: e.target.value })} className="campo w-[7.5rem] px-3 py-2 tabular-nums" aria-label={`Abertura de ${NOMES_DIAS[dia]}`} />
                    até
                    <input type="time" value={item.fim} onChange={(e) => mudarDia(dia, { fim: e.target.value })} className="campo w-[7.5rem] px-3 py-2 tabular-nums" aria-label={`Fechamento de ${NOMES_DIAS[dia]}`} />
                  </div>
                ) : (
                  <span className="text-sm text-cinza">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>

        <Subtitulo titulo="Folgas e feriados" texto="Fecha o estúdio nessas datas, mesmo em dias normalmente abertos." onAdicionar={adicionarFolga} rotuloAdicionar="Adicionar folga" />
        <div className="space-y-3">
          {horarios.folgas.map((folga) => (
            <div key={folga.id} className="grid gap-2 rounded-xl border border-linha p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
              <Campo rotulo="De">
                <input type="date" value={folga.inicio} onChange={(e) => mudarFolga(folga.id, { inicio: e.target.value })} className="campo px-3 py-2 tabular-nums" />
              </Campo>
              <Campo rotulo="Até">
                <input type="date" value={folga.fim} onChange={(e) => mudarFolga(folga.id, { fim: e.target.value })} className="campo px-3 py-2 tabular-nums" />
              </Campo>
              <Campo rotulo="Motivo (aparece no site)">
                <input value={folga.motivo} maxLength={60} placeholder="Ex.: feriado" onChange={(e) => mudarFolga(folga.id, { motivo: e.target.value })} className="campo px-3 py-2" />
              </Campo>
              <Remover
                rotulo="Remover folga"
                onClick={() => setHorarios((atual) => ({ ...atual, folgas: atual.folgas.filter((item) => item.id !== folga.id) }))}
              />
            </div>
          ))}
        </div>

        <Subtitulo
          titulo="Horários especiais"
          texto="Abre dias que normalmente ficam fechados, ou muda o horário num período. Ex.: domingos de dezembro."
          onAdicionar={adicionarPeriodo}
          rotuloAdicionar="Adicionar horário especial"
        />
        <div className="space-y-3">
          {horarios.periodosEspeciais.map((periodo) => (
            <div key={periodo.id} className="space-y-3 rounded-xl border border-linha p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Campo rotulo="De">
                  <input type="date" value={periodo.inicio} onChange={(e) => mudarPeriodo(periodo.id, { inicio: e.target.value })} className="campo px-3 py-2 tabular-nums" />
                </Campo>
                <Campo rotulo="Até">
                  <input type="date" value={periodo.fim} onChange={(e) => mudarPeriodo(periodo.id, { fim: e.target.value })} className="campo px-3 py-2 tabular-nums" />
                </Campo>
                <Campo rotulo="Abre">
                  <input type="time" value={periodo.horaInicio} onChange={(e) => mudarPeriodo(periodo.id, { horaInicio: e.target.value })} className="campo px-3 py-2 tabular-nums" />
                </Campo>
                <Campo rotulo="Fecha">
                  <input type="time" value={periodo.horaFim} onChange={(e) => mudarPeriodo(periodo.id, { horaFim: e.target.value })} className="campo px-3 py-2 tabular-nums" />
                </Campo>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ORDEM_DA_SEMANA.map((dia) => {
                  const marcado = periodo.dias.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() =>
                        mudarPeriodo(periodo.id, {
                          dias: marcado ? periodo.dias.filter((item) => item !== dia) : [...periodo.dias, dia],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${marcado ? "border-giz bg-giz text-white" : "border-linha text-cinza"}`}
                    >
                      {NOMES_DIAS[dia].slice(0, 3)}
                    </button>
                  );
                })}
                <Remover
                  rotulo="Remover horário especial"
                  onClick={() =>
                    setHorarios((atual) => ({ ...atual, periodosEspeciais: atual.periodosEspeciais.filter((item) => item.id !== periodo.id) }))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <Rodape mensagem={mensagemHorarios} salvando={salvandoHorarios} rotulo="Salvar expediente" onSalvar={salvarHorarios} />
      </Bloco>

      {/* ── Catálogo ── */}
      <Bloco
        titulo="Catálogo de serviços"
        texto="Crie, renomeie ou apague categorias e serviços. Ocultar tira o serviço do site sem apagar o histórico. “A partir de” avisa que o preço pode variar."
      >
        <div className="space-y-5">
          {categorias.map((categoria) => {
            const daCategoria = servicos.filter((item) => item.categoriaId === categoria.id);
            return (
              <section key={categoria.id} className="rounded-2xl border border-linha bg-carvao p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={categoria.nome}
                    maxLength={40}
                    placeholder="Nome da categoria (ex.: Unhas)"
                    onChange={(e) => {
                      const nome = e.target.value;
                      setCategorias((atuais) => atuais.map((item) => (item.id === categoria.id ? { ...item, nome } : item)));
                    }}
                    className="campo flex-1 px-3 py-2 text-lg font-bold"
                    aria-label="Nome da categoria"
                  />
                  <Remover rotulo={`Apagar categoria ${categoria.nome}`.trim()} onClick={() => apagarCategoria(categoria)} />
                </div>

                <div className="mt-3 space-y-3">
                  {daCategoria.length === 0 && <p className="px-1 text-sm text-cinza">Nenhum serviço nesta categoria ainda.</p>}
                  {daCategoria.map((servico) => (
                    <div key={servico.id} className={`rounded-xl border p-3 ${servico.ativo ? "border-linha" : "border-dashed border-linha opacity-70"}`}>
                      <div className="flex items-center gap-2">
                        <input
                          value={servico.nome}
                          maxLength={60}
                          placeholder="Nome do serviço"
                          onChange={(e) => mudarServico(servico.id, { nome: e.target.value })}
                          className="campo flex-1 px-3 py-2 font-semibold"
                          aria-label="Nome do serviço"
                        />
                        <button
                          type="button"
                          onClick={() => mudarServico(servico.id, { ativo: !servico.ativo })}
                          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${servico.ativo ? "border-giz/40 text-giz" : "border-linha text-cinza"}`}
                        >
                          {servico.ativo ? "Visível" : "Oculto"}
                        </button>
                        <Remover
                          rotulo={`Apagar ${servico.nome || "serviço"}`}
                          onClick={() => setServicos((atuais) => atuais.filter((item) => item.id !== servico.id))}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-end">
                        <Campo rotulo="Categoria">
                          <select
                            value={servico.categoriaId}
                            onChange={(e) => mudarServico(servico.id, { categoriaId: e.target.value })}
                            className="campo px-3 py-2"
                          >
                            {categorias.map((opcao) => (
                              <option key={opcao.id} value={opcao.id}>
                                {opcao.nome.trim() || "(sem nome)"}
                              </option>
                            ))}
                          </select>
                        </Campo>
                        <Campo rotulo="Preço (R$)">
                          <input
                            inputMode="decimal"
                            value={servico.precoTexto}
                            placeholder="0,00"
                            onChange={(e) => mudarServico(servico.id, { precoTexto: e.target.value })}
                            className="campo px-3 py-2 tabular-nums"
                          />
                        </Campo>
                        <Campo rotulo="Duração">
                          <select
                            value={servico.duracaoMin}
                            onChange={(e) => mudarServico(servico.id, { duracaoMin: Number(e.target.value) })}
                            className="campo px-3 py-2"
                          >
                            {[...new Set([...DURACOES, servico.duracaoMin])].sort((a, b) => a - b).map((minutos) => (
                              <option key={minutos} value={minutos}>
                                {formatarDuracao(minutos)}
                              </option>
                            ))}
                          </select>
                        </Campo>
                        <label className="flex items-center gap-2 py-2 text-sm text-cinza">
                          <input
                            type="checkbox"
                            checked={servico.aPartirDe}
                            onChange={(e) => mudarServico(servico.id, { aPartirDe: e.target.checked })}
                            className="h-4 w-4 accent-[#c8102e]"
                          />
                          a partir de
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => adicionarServico(categoria.id)}
                  className="mt-3 flex items-center gap-1.5 px-1 text-sm font-semibold text-vermelho-vivo hover:underline"
                >
                  <IconeMais className="h-3.5 w-3.5" /> Adicionar serviço{categoria.nome.trim() ? ` em ${categoria.nome.trim()}` : ""}
                </button>
              </section>
            );
          })}
        </div>

        <button type="button" onClick={adicionarCategoria} className="botao-contorno mt-5 w-full border-dashed">
          <IconeMais /> Adicionar categoria
        </button>

        <Rodape mensagem={mensagemServicos} salvando={salvandoServicos} rotulo="Salvar catálogo" onSalvar={salvarServicos} />
      </Bloco>
    </main>
  );
}

function Bloco({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-linha bg-carvao/60 p-5">
      <h2 className="font-display text-2xl">{titulo}</h2>
      <p className="mt-1 text-sm text-cinza">{texto}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Subtitulo({
  titulo,
  texto,
  onAdicionar,
  rotuloAdicionar,
}: {
  titulo: string;
  texto: string;
  onAdicionar: () => void;
  rotuloAdicionar: string;
}) {
  return (
    <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3 border-t border-linha pt-6">
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="text-sm text-cinza">{texto}</p>
      </div>
      <button type="button" onClick={onAdicionar} className="flex items-center gap-1.5 text-sm font-medium text-vermelho-vivo hover:underline">
        <IconeMais className="h-3.5 w-3.5" /> {rotuloAdicionar}
      </button>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-cinza">{rotulo}</span>
      {children}
    </label>
  );
}

function Remover({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-cinza transition-colors hover:bg-carvao-2 hover:text-vermelho-vivo"
    >
      <IconeFechar />
    </button>
  );
}

function Rodape({
  mensagem,
  salvando,
  rotulo,
  onSalvar,
}: {
  mensagem: Mensagem;
  salvando: boolean;
  rotulo: string;
  onSalvar: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-5">
      <p role={mensagem?.tipo === "erro" ? "alert" : "status"} className={`text-sm ${mensagem?.tipo === "erro" ? "text-vermelho-vivo" : "text-cinza"}`}>
        {mensagem?.texto}
      </p>
      <button type="button" onClick={onSalvar} disabled={salvando} className="botao-vermelho h-12 px-6">
        {salvando ? "Salvando…" : rotulo}
      </button>
    </div>
  );
}
