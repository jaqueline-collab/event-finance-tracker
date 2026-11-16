import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Settings, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, GripVertical, MoreHorizontal, Pin, Redo2, RotateCcw, Undo2, X } from "lucide-react";
import { BarraTabela, type FormatoExportar } from "@/components/barra-tabela";
import { exportarMatriz } from "@/lib/matriz-exportar";
import { InfoTitulo } from "@/components/info-titulo";
import { textoBlocoOuAuto, textoColunaOuAuto } from "@/lib/textos-info";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cicloOrdem, compararValores, type OrdemTabela, alinhamento, colunaNumerica, colunasVisiveis, compararGrupo, estadoInicial, moverColuna, type EstadoColunas } from "@/lib/colunas-tabela";
import { CAMPO_STATUS_LEAD, ROTULO_STATUS_PADRAO, corEtiqueta } from "@/lib/status-lead";
import { ListaOrdenavel, moverPara } from "@/components/lista-ordenavel";
import { estiloCor } from "@/lib/cores-status";
import { ConfigStatusLead } from "@/components/config-status-lead";
import { toast } from "sonner";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FiltroCampos, SelosFixos } from "@/components/filtro-campos";
import type { FiltroCampo, FonteCampo } from "@/lib/campos-elora";
import { FONTES_CATALOGO } from "@/lib/campos-elora";
import { calcularCartoes, itensDiaCalendario, lerInicioSemana, salvarInicioSemana, moverCartaoVisao, opcoesGraficos, salvarCartoesVisao } from "@/lib/graficos.functions";
import { desfazer, empurrar, encaixar, historico, LARGURA_GRADE_PX, LARGURAS_RAPIDAS, layoutPadrao, LINHA_PX, redimensionar, refazer, reordenar, tamanhoDe, type Historico } from "@/lib/layout-blocos";
import {
  aplicarAlternativa, ehTituloPadrao, fontesDisponiveis, funilTop, percentuaisFunil, MEDIDAS, tituloPadrao, type ItemDia, novoCartao, ROTULO_MEDIDA, ROTULO_TIPO_GRAFICO, tiposDisponiveis, type CartaoGrafico, type CampoRef, type ResultadoCartao,
} from "@/lib/graficos";
import { formatarDuracao, type Periodo } from "@/lib/painel-visual";
import { NAO_DEFINIDO } from "@/lib/nao-definido";
import { ehUrl, formatarMoeda, rotuloCorrido, textoLink } from "@/lib/formatos";
import { cartaoPesado, filtrarPorTipo, inicioDaSemana, reguaHoras, resumoDiaMes, type EventoCalendario, type FiltroTipoCalendario } from "@/lib/graficos";
import { avisoSemHistorico } from "@/lib/formatos";

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)", "var(--muted-foreground)"];
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
type Opcoes = Awaited<ReturnType<typeof opcoesGraficos>>;

function fmt(v: number | null | undefined, c: Pick<CartaoGrafico, "formato" | "medida">) {
  if (v == null || !Number.isFinite(v)) return "—";
  if (c.medida === "tempo_medio") return formatarDuracao(v);
  if (c.formato === "moeda") return formatarMoeda(v);
  if (c.formato === "percentual") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: c.medida === "media" ? 1 : 0 });
}

/** Grade de cartões configuráveis de uma visão. Cliente vê pronto; super admin edita em modo Editar. */
export function CartoesGraficos({
  clienteId, visaoId, iniciais, editando, podeEditar, periodo, filtrosVisao, onFiltroGrafico, outrasVisoes, novoChave, blocosFixos,
}: {
  /** Blocos com conteúdo próprio (ex.: a tabela do Relatório diário): movem e redimensionam, mas não são editados nem removidos. */
  blocosFixos?: Record<string, React.ReactNode>;
  clienteId: string;
  visaoId: string;
  iniciais: CartaoGrafico[];
  editando: boolean;
  podeEditar: boolean;
  periodo: Periodo;
  filtrosVisao: FiltroCampo[];
  onFiltroGrafico: (f: FiltroCampo) => void;
  outrasVisoes: { id: string; nome: string }[];
  /** Muda a cada clique em "+ Gráfico" na barra da super admin. */
  novoChave: number;
}) {
  const [cartoes, setCartoes] = useState(iniciais);
  const [hist, setHist] = useState<Historico<CartaoGrafico[]>>(() => historico(iniciais));
  const [editor, setEditor] = useState<CartaoGrafico | null>(null);
  const [previa, setPrevia] = useState<{ id: string; largura: number; altura: number } | null>(null);
  const grade = useRef<HTMLDivElement>(null);
  const larga = useLarga();
  const editavel = editando && podeEditar;
  useEffect(() => { setCartoes(iniciais); setHist(historico(iniciais)); }, [visaoId, iniciais]);
  useEffect(() => { if (!editavel) setHist(historico(cartoes)); }, [editavel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (novoChave > 0 && editavel) setEditor(novoCartao(crypto.randomUUID().slice(0, 12)));
  }, [novoChave]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistir = async (lista: CartaoGrafico[], antes: CartaoGrafico[], ok?: string) => {
    setCartoes(lista);
    try {
      await salvarCartoesVisao({ data: { clienteId, visaoId, cartoes: lista } });
      if (ok) toast.success(ok);
      return true;
    } catch (e) {
      setCartoes(antes);
      toast.error(msg(e));
      return false;
    }
  };
  const gravar = async (lista: CartaoGrafico[], ok?: string) => {
    const antes = cartoes;
    if (await persistir(lista, antes, ok)) setHist((h) => empurrar(h, lista));
  };
  const voltar = async (h: Historico<CartaoGrafico[]>) => {
    if (await persistir(h.presente, cartoes)) setHist(h);
  };
  // Mover blocos pela alça (funciona com qualquer conteúdo: tabela, calendário, gráficos).
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );
  const aoSoltarBloco = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    void gravar(reordenar(cartoes, String(e.active.id), String(e.over.id)));
  };
  const iniciarResize = (e: React.PointerEvent, c: CartaoGrafico, eixo: "x" | "y" | "xy") => {
    e.preventDefault();
    e.stopPropagation();
    const larguraGrade = grade.current?.clientWidth ?? 1200;
    const col = (larguraGrade + 16) / 12;
    const t0 = tamanhoDe(c);
    const x0 = e.clientX, y0 = e.clientY;
    let atual = t0;
    const mover = (ev: PointerEvent) => {
      const l = eixo === "y" ? t0.largura : t0.largura + encaixar(ev.clientX - x0, col);
      const a = eixo === "x" ? t0.altura : t0.altura + encaixar(ev.clientY - y0, LINHA_PX);
      atual = tamanhoDe(redimensionar(c, l, a));
      setPrevia({ id: c.id, ...atual });
    };
    const soltarResize = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltarResize);
      setPrevia(null);
      if (atual.largura !== t0.largura || atual.altura !== t0.altura) void gravar(cartoes.map((x) => (x.id === c.id ? redimensionar(x, atual.largura, atual.altura) : x)));
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltarResize);
  };

  if (!cartoes.length && !editor) return null;
  return (
    <>
      {editavel && cartoes.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {hist.passado.length > 0 && <Button size="sm" variant="outline" className="h-8" onClick={() => void voltar(desfazer(hist))}><Undo2 className="mr-1 h-4 w-4" />Desfazer</Button>}
          {hist.futuro.length > 0 && <Button size="sm" variant="outline" className="h-8" onClick={() => void voltar(refazer(hist))}><Redo2 className="mr-1 h-4 w-4" />Refazer</Button>}
          <Button size="sm" variant="ghost" className="h-8" onClick={() => void gravar(layoutPadrao(cartoes), "Layout padrão restaurado.")}><RotateCcw className="mr-1 h-4 w-4" />Restaurar layout padrão da visão</Button>
          {!larga && <span className="text-xs text-muted-foreground">Em telas estreitas cada bloco ocupa a linha toda; redimensione numa tela larga.</span>}
        </div>
      )}
      {cartoes.length > 0 && (
        <SalvarOrdemCtx.Provider value={editavel ? (id, ordem) => void gravar(cartoes.map((x) => (x.id === id ? { ...x, ordemTabela: ordem } : x)), "Ordem padrão salva.") : null}>
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltarBloco}>
          <SortableContext items={cartoes.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div ref={grade} className="grid grid-cols-1 gap-4" style={larga ? { gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridAutoRows: `minmax(${LINHA_PX - 16}px, auto)` } : undefined}>
          {cartoes.map((c) => {
            const t = previa?.id === c.id ? previa : tamanhoDe(c);
            return (
            <BlocoOrdenavel
              key={c.id}
              id={c.id}
              ativo={editavel}
              className={`group relative min-w-0 ${editavel ? "rounded-xl ring-primary/40 hover:ring-2" : ""}`}
              style={larga ? { gridColumn: `span ${t.largura} / span ${t.largura}`, gridRow: `span ${t.altura} / span ${t.altura}`, minHeight: t.altura * LINHA_PX - 16 } : undefined}
            >{(alca) => (<>
              {blocosFixos?.[c.id] !== undefined ? (
                <div className="relative h-full min-w-0">
                  {editavel && (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-card/90 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <button type="button" {...alca} className="cursor-grab touch-none rounded p-0.5 text-muted-foreground active:cursor-grabbing" aria-label="Arrastar para reordenar"><GripVertical className="h-4 w-4" /></button>
                      {larga && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opções do bloco"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {LARGURAS_RAPIDAS.map((o) => (
                              <DropdownMenuItem key={o.largura} onClick={() => void gravar(cartoes.map((x) => (x.id === c.id ? redimensionar(x, o.largura, tamanhoDe(x).altura) : x)))}>{o.rotulo}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                  {blocosFixos[c.id]}
                </div>
              ) : (
              <CartaoView
                clienteId={clienteId}
                cartao={c}
                periodo={periodo}
                filtrosVisao={filtrosVisao}
                onFiltroGrafico={onFiltroGrafico}
                menu={
                  editavel ? (
                    <div className="flex items-center gap-1 rounded-md bg-card/90 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <button type="button" {...alca} className="cursor-grab touch-none rounded p-0.5 text-muted-foreground active:cursor-grabbing" aria-label="Arrastar para reordenar"><GripVertical className="h-4 w-4" /></button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opções do gráfico">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditor(c)}>Editar</DropdownMenuItem>
                          {larga && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Largura</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {LARGURAS_RAPIDAS.map((o) => (
                                  <DropdownMenuItem key={o.largura} onClick={() => void gravar(cartoes.map((x) => (x.id === c.id ? redimensionar(x, o.largura, tamanhoDe(x).altura) : x)))}>{o.rotulo}</DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuItem onClick={() => void gravar([...cartoes, { ...c, id: crypto.randomUUID().slice(0, 12), titulo: `${c.titulo} (cópia)` }], "Gráfico duplicado.")}>Duplicar</DropdownMenuItem>
                          {outrasVisoes.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Mover para outra visão</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {outrasVisoes.map((v) => (
                                  <DropdownMenuItem
                                    key={v.id}
                                    onClick={async () => {
                                      try {
                                        await moverCartaoVisao({ data: { clienteId, de: visaoId, para: v.id, cartaoId: c.id } });
                                        setCartoes((l) => l.filter((x) => x.id !== c.id));
                                        toast.success(`Gráfico movido para "${v.nome}".`);
                                      } catch (e) {
                                        toast.error(msg(e));
                                      }
                                    }}
                                  >
                                    {v.nome}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => void gravar(cartoes.filter((x) => x.id !== c.id), "Gráfico removido. Nenhum dado foi apagado.")}>
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null
                }
              />
              )}
              {editavel && larga && (
                <>
                  <span role="separator" aria-label="Redimensionar largura" className="absolute inset-y-6 -right-1.5 z-20 flex w-3 cursor-ew-resize items-center justify-center rounded hover:bg-primary/30" onPointerDown={(e) => iniciarResize(e, c, "x")}><span className="h-8 w-1 rounded-full bg-primary/50" /></span>
                  <span role="separator" aria-label="Redimensionar altura" className="absolute inset-x-6 -bottom-1.5 z-20 h-3 cursor-ns-resize rounded hover:bg-primary/30" onPointerDown={(e) => iniciarResize(e, c, "y")}><span className="mx-auto mt-1 block h-1 w-8 rounded-full bg-primary/50" /></span>
                  <span role="separator" aria-label="Redimensionar" className="absolute -bottom-1.5 -right-1.5 z-20 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-primary bg-card" onPointerDown={(e) => iniciarResize(e, c, "xy")} />
                  {previa?.id === c.id && <span className="absolute right-2 top-2 rounded bg-primary px-1.5 text-xs text-primary-foreground">{t.largura}/12 · {t.altura}</span>}
                </>
              )}
            </>)}</BlocoOrdenavel>
            );
          })}
        </div>
          </SortableContext>
        </DndContext>
        </SalvarOrdemCtx.Provider>
      )}
      {editor && (
        <EditorCartao
          clienteId={clienteId}
          inicial={editor}
          periodo={periodo}
          filtrosVisao={filtrosVisao}
          onFechar={() => setEditor(null)}
          onSalvar={async (c) => {
            const existe = cartoes.some((x) => x.id === c.id);
            await gravar(existe ? cartoes.map((x) => (x.id === c.id ? c : x)) : [...cartoes, c], "Gráfico salvo.");
            setEditor(null);
          }}
        />
      )}
    </>
  );
}

/** Bloco que pode ser movido pela alça (dnd-kit), igual às abas. */
function BlocoOrdenavel({ id, ativo, className, style, children }: { id: string; ativo: boolean; className: string; style?: React.CSSProperties; children: (alca: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !ativo });
  return (
    <div ref={setNodeRef} className={`${className} ${isDragging ? "z-10 opacity-60" : ""}`} style={{ ...style, transform: CSS.Translate.toString(transform), transition }}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/** Gravação da ordem padrão das tabelas: só existe para a super admin em Editar. */
const SalvarOrdemCtx = createContext<((cartaoId: string, ordem: OrdemTabela) => void) | null>(null);

function useLarga() {
  const [larga, setLarga] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${LARGURA_GRADE_PX}px)`);
    const f = () => setLarga(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return larga;
}

/**
 * Pedidos dos cartões juntados por visão: a cada rodada, um pedido para os blocos leves
 * (indicadores, dois valores, gráficos) e outro, logo depois, para os pesados
 * (Matriz por UTM, tabela, calendário). Cada bloco mostra o próprio esqueleto.
 */
/**
 * Painel incorporado (link sem login): a página do link troca a fonte do cálculo e da lista do dia
 * por funções que validam o token no servidor. Sem fonte, tudo segue pelo caminho normal com login.
 */
type FonteIncorporada = {
  calcular: (args: { de: string; ate: string; filtrosVisao: FiltroCampo[] }, cartoes: CartaoGrafico[]) => Promise<Record<string, unknown>>;
  itensDia: (dia: string, cartao: CartaoGrafico, filtrosVisao: FiltroCampo[]) => Promise<{ itens: unknown[] }>;
};
let fonteIncorporada: FonteIncorporada | null = null;
export function usarFonteIncorporada(f: FonteIncorporada | null) { fonteIncorporada = f; }
function lerItensDia(clienteId: string, dia: string, cartao: CartaoGrafico, filtrosVisao: FiltroCampo[]) {
  return fonteIncorporada ? fonteIncorporada.itensDia(dia, cartao, filtrosVisao) : itensDiaCalendario({ data: { clienteId, dia, cartao, filtrosVisao } });
}

type Pedido = { cartao: CartaoGrafico; ok: (x: any) => void; erro: (e: unknown) => void };
const filas = new Map<string, { args: { clienteId: string; de: string; ate: string; filtrosVisao: FiltroCampo[]; previa: boolean }; pedidos: Pedido[] }>();
let agendado = false;
function despachar() {
  agendado = false;
  const lotes = [...filas.values()];
  filas.clear();
  for (const l of lotes) {
    const leves = l.pedidos.filter((p) => !cartaoPesado(p.cartao));
    const pesados = l.pedidos.filter((p) => cartaoPesado(p.cartao));
    const enviar = (ps: Pedido[]) => {
      if (!ps.length) return Promise.resolve();
      const pedido = fonteIncorporada ? fonteIncorporada.calcular(l.args, ps.map((p) => p.cartao)) : calcularCartoes({ data: { ...l.args, cartoes: ps.map((p) => p.cartao) } });
      return pedido
        .then((res: any) => ps.forEach((p) => p.ok(res[p.cartao.id])))
        .catch((e) => ps.forEach((p) => p.erro(e)));
    };
    enviar(leves);
    // os pesados saem logo em seguida, sem esperar os leves terminarem
    setTimeout(() => enviar(pesados), leves.length ? 50 : 0);
  }
}
function pedirCartao(args: { clienteId: string; de: string; ate: string; filtrosVisao: FiltroCampo[]; previa: boolean }, cartao: CartaoGrafico) {
  return new Promise<any>((ok, erro) => {
    const k = JSON.stringify(args);
    const f = filas.get(k) ?? { args, pedidos: [] };
    f.pedidos.push({ cartao, ok, erro });
    filas.set(k, f);
    if (!agendado) {
      agendado = true;
      setTimeout(despachar, 0);
    }
  });
}

function useResultado(clienteId: string, cartao: CartaoGrafico, periodo: Periodo, filtrosVisao: FiltroCampo[], previa = false) {
  const [r, setR] = useState<{ oculto: boolean; r: ResultadoCartao | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const chave = JSON.stringify([cartao, periodo, filtrosVisao]);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      pedirCartao({ clienteId, de: periodo.de, ate: periodo.ate, filtrosVisao, previa }, cartao)
        .then((x: any) => vivo && (setR({ oculto: Boolean(x?.oculto), r: x?.r ?? null }), setErro(null)))
        .catch((e) => vivo && setErro(msg(e)));
    }, previa ? 350 : 0);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  return { r, erro };
}

function CartaoView({
  clienteId, cartao, periodo, filtrosVisao, onFiltroGrafico, menu, previa,
}: {
  clienteId: string; cartao: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; onFiltroGrafico?: (f: FiltroCampo) => void; menu?: React.ReactNode; previa?: boolean;
}) {
  if (cartao.tipo === "calendario") return <CalendarioCartao clienteId={clienteId} cartao={cartao} periodo={periodo} filtrosVisao={filtrosVisao} menu={menu} previa={previa} />;
  return <CartaoComum clienteId={clienteId} cartao={cartao} periodo={periodo} filtrosVisao={filtrosVisao} onFiltroGrafico={onFiltroGrafico} menu={menu} previa={previa} />;
}

function CartaoComum({
  clienteId, cartao, periodo, filtrosVisao, onFiltroGrafico, menu, previa,
}: {
  clienteId: string; cartao: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; onFiltroGrafico?: (f: FiltroCampo) => void; menu?: React.ReactNode; previa?: boolean;
}) {
  const [dim, setDim] = useState(cartao.dimensao);
  const [alt, setAlt] = useState(-1);
  const base = alt >= 0 ? aplicarAlternativa(cartao, alt) : cartao;
  const efetivo = cartao.painel === "leads-por" ? { ...base, dimensao: dim } : base;
  const { r, erro } = useResultado(clienteId, efetivo, periodo, filtrosVisao, previa);
  if (r?.oculto) return null;
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1"><h3 className="flex items-center gap-1 text-sm font-semibold">{cartao.titulo}<InfoTitulo titulo={cartao.titulo} texto={textoBlocoOuAuto(cartao)} incompleto={!!r?.r?.cobertura && r.r.cobertura !== "confirmado"} /><SelosFixos clienteId={clienteId} filtros={cartao.filtros} /></h3></div>
        <div className="flex items-center gap-1">
          {cartao.painel === "leads-por" && <Select value={dim?.campo ?? "origem"} onValueChange={(campo) => setDim({ fonte: campo === "canal" ? "atendimento" : campo === "campaign" ? "utm" : "contato", campo })}>
            <SelectTrigger className="h-8 w-auto" aria-label="Dimensão da rosca"><SelectValue /></SelectTrigger>
            <SelectContent>{[["origem", "Origem"], ["canal", "Canal"], ["etiquetas", "Etiqueta"], ["campaign", "Campanha"]].map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
          </Select>}
          {menu}
        </div>
      </header>
      {cartao.medidasAlternaveis.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Medida exibida">
          {[{ rotulo: ROTULO_MEDIDA[cartao.medida] }, ...cartao.medidasAlternaveis].map((m, i) => (
            <button key={i} type="button" aria-pressed={alt === i - 1} onClick={() => setAlt(i - 1)} className={`rounded-full border px-2.5 py-0.5 text-xs ${alt === i - 1 ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{m.rotulo}</button>
          ))}
        </div>
      )}
      {erro && !r ? (
        <p className="text-sm text-muted-foreground">Não foi possível calcular agora.</p>
      ) : !r ? (
        <Skeleton className="h-48 w-full" />
      ) : !r.r ? (
        <p className="text-sm text-muted-foreground">Sem dados para esta configuração.</p>
      ) : (
        <Grafico cartao={efetivo} r={r.r} onClique={onFiltroGrafico && efetivo.dimensao && cartao.medida !== "indicador" ? (rot) => rot !== "Outros" && onFiltroGrafico({ fonte: efetivo.dimensao?.fonte ?? cartao.fonte, campo: efetivo.dimensao?.campo ?? "origem", op: "em", valores: [rot] }) : undefined} />
      )}
      {r?.r?.rodape && <p className="mt-1 text-xs text-muted-foreground">{r.r.rodape}</p>}
      {r?.r?.semHistoricoAntes && <p className="mt-2 text-xs text-muted-foreground">{avisoSemHistorico(r.r.semHistoricoAntes)}</p>}
    </section>
  );
}

/** Variação: sucesso, alerta (destrutivo) ou neutro — tokens com contraste AA nos dois temas. */
export const corVariacao = (varia: number | null, bom: boolean) => (varia == null || Math.abs(varia) < 0.05 ? "text-muted-foreground" : bom ? "text-success" : "text-destructive");

/** Legenda: texto sempre escuro (token), a cor fica só na amostra ao lado. */
const textoLegenda = (v: unknown) => <span style={{ color: "var(--foreground)" }}>{String(v)}</span>;

function Grafico({ cartao: c, r, onClique }: { cartao: CartaoGrafico; r: ResultadoCartao; onClique?: (rotulo: string) => void }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const dados = useMemo(() => r.categorias.map((x) => ({ rotulo: x.rotulo, total: x.total, ...x.valores })), [r]);
  const series = r.series.filter((s) => !ocultas.includes(s));
  const legenda = r.series.length > 1 ? <Legend onClick={(e: any) => setOcultas((o) => (o.includes(e.value) ? o.filter((x) => x !== e.value) : [...o, e.value]))} wrapperStyle={{ cursor: "pointer", fontSize: 12 }} formatter={textoLegenda} /> : null;
  const eixo = { tick: { fontSize: 11, fill: "var(--muted-foreground)" }, stroke: "var(--border)" };
  const tip = <Tooltip formatter={(v: any) => fmt(Number(v), c)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />;
  const clique = (d: any) => onClique?.(d?.rotulo ?? d?.payload?.rotulo ?? d?.name);

  if (c.tipo === "numero") {
    const varia = r.anterior != null && r.anterior !== 0 ? ((r.total - r.anterior) / r.anterior) * 100 : null;
    const menorMelhor = c.medida === "tempo_medio";
    const bom = varia != null && (menorMelhor ? varia <= 0 : varia >= 0);
    return (
      <div className="flex flex-1 flex-col justify-center py-2">
        <p className="text-4xl font-bold tracking-tight">{r.total === 0 && r.cobertura && r.cobertura !== "confirmado" ? "—" : fmt(r.total, c)}</p>
        {c.comparar && (
          <p className={`mt-1 flex items-center gap-1 text-sm ${corVariacao(varia, bom)}`}>
            {varia != null && (varia >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
            {varia == null ? "Sem base no período anterior" : `${varia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior (${fmt(r.anterior, c)})`}
          </p>
        )}
      </div>
    );
  }
  if (c.tipo === "dois_valores") {
    const v = (a: number, b: number | null | undefined) => (b != null && b !== 0 ? ((a - b) / b) * 100 : null);
    const linha = (rot: string, a: number, b: number | null | undefined, cf: Pick<CartaoGrafico, "formato" | "medida">) => {
      const x = v(a, b);
      return (
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{rot}</p>
          <p className="truncate text-3xl font-bold tracking-tight">{fmt(a, cf)}</p>
          {c.comparar && <p className={`mt-0.5 flex items-center gap-1 text-xs ${corVariacao(x, (x ?? 0) >= 0)}`}>{x != null && (x >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}{x == null ? "Sem base anterior" : `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. anterior`}</p>}
        </div>
      );
    };
    return (
      <div className="grid flex-1 grid-cols-2 items-center gap-4 py-2">
        {linha("Total", r.total, r.anterior, c)}
        {linha("Quantidade", r.qtd ?? 0, r.qtdAnterior, { formato: "numero", medida: "contagem" })}
      </div>
    );
  }
  if (c.tipo === "matriz_utm") return <TabelaCartao cartao={{ ...c, painel: "atendentes", formato: "numero" }} r={r} />;
  if (c.tipo === "tabela_itens") return <TabelaItens cartao={c} r={r} />;
  if (c.tipo === "tabela") return <TabelaCartao cartao={c} r={r} />;
  if (c.tipo === "mapa") return <MapaCartao cartao={c} r={r} onClique={onClique} />;
  if (!dados.length) return <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>;
  if (c.tipo === "funil") return <FunilCartao cartao={c} r={r} onClique={onClique} />;

  return (
    <div className="h-64 w-full">
      {(c.tipo === "pizza" || c.tipo === "rosca") && <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{fmt(r.categorias.reduce((a, b) => a + b.total, 0), c)}</span></p>}
      <ResponsiveContainer>
        {c.tipo === "pizza" || c.tipo === "rosca" ? (
          <PieChart>
            {tip}
            <Pie data={dados} dataKey="total" nameKey="rotulo" innerRadius={c.tipo === "rosca" ? "55%" : 0} outerRadius="85%" onClick={clique} className={onClique ? "cursor-pointer" : ""}>
              {dados.map((d, i) => <Cell key={d.rotulo} fill={d.rotulo === NAO_DEFINIDO ? "var(--muted)" : CORES[i % CORES.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: any, e: any) => { const t = r.categorias.reduce((a, b) => a + b.total, 0); const x = e?.payload?.total ?? 0; return textoLegenda(`${v} · ${(t ? (x / t) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`); }} />
            {c.tipo === "rosca" && <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-semibold">{fmt(r.categorias.reduce((a, b) => a + b.total, 0), c)}</text>}
          </PieChart>
        ) : c.tipo === "linhas" ? (
          <LineChart data={dados}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="rotulo" {...eixo} />
            <YAxis {...eixo} width={40} />
            {tip}
            {legenda}
            {series.map((s, i) => <Line key={s} dataKey={s} stroke={CORES[i % CORES.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : c.tipo === "area" ? (
          <AreaChart data={dados}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="rotulo" {...eixo} />
            <YAxis {...eixo} width={40} />
            {tip}
            {legenda}
            {series.map((s, i) => <Area key={s} dataKey={s} stackId="a" stroke={CORES[i % CORES.length]} fill={CORES[i % CORES.length]} fillOpacity={0.25} />)}
          </AreaChart>
        ) : (
          <BarChart data={dados}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="rotulo" {...eixo} interval="preserveStartEnd" />
            <YAxis {...eixo} width={40} />
            {tip}
            {legenda}
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} stackId={c.tipo === "barras_empilhadas" ? "a" : undefined} fill={CORES[i % CORES.length]} radius={c.tipo === "barras_empilhadas" ? 0 : [4, 4, 0, 0]} onClick={clique} className={onClique ? "cursor-pointer" : ""} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function TabelaCartao({ cartao: c, r }: { cartao: CartaoGrafico; r: ResultadoCartao }) {
  const series = c.painel === "atendentes" ? r.series : r.series.length > 1 ? [...r.series, "total"] : ["total"];
  const colunas = [{ chave: "rotulo", rotulo: c.dimensao ? "Item" : "Categoria" }, ...series.map((chave) => ({ chave, rotulo: chave === "total" ? "Total" : chave }))];
  const itens = r.categorias.map((l, i) => ({
    id: `${i}:${l.rotulo}`,
    valores: Object.fromEntries([["rotulo", l.rotulo], ...series.map((k) => [k, k === "Proporção (%)" ? `${(l.valores[k] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : fmt(k === "total" ? l.total : l.valores[k], c)])]),
    brutos: Object.fromEntries([["rotulo", l.rotulo], ...series.map((k) => [k, String(k === "total" ? l.total : l.valores[k] ?? "")])]),
  }));
  return <TabelaItens cartao={c} r={{ ...r, colunasItens: colunas, itens }} ordemInicial={{ col: "total", desc: true }} />;
}

/** Mapa em grade de quadros por região (sem mapa externo). Só aparece quando o cliente tem campo geográfico. */
function MapaCartao({ cartao: c, r, onClique }: { cartao: CartaoGrafico; r: ResultadoCartao; onClique?: (rotulo: string) => void }) {
  const max = Math.max(1, ...r.categorias.map((x) => x.total));
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {r.categorias.map((x) => (
        <button
          key={x.rotulo}
          type="button"
          onClick={() => onClique?.(x.rotulo)}
          className="rounded-md border p-2 text-left text-xs"
          style={{ background: `color-mix(in oklch, var(--primary) ${Math.round((x.total / max) * 70)}%, var(--card))` }}
        >
          <span className="block truncate font-medium">{x.rotulo}</span>
          <span className="tabular-nums">{fmt(x.total, c)}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- editor ---------------- */

function EditorCartao({
  clienteId, inicial, periodo, filtrosVisao, onFechar, onSalvar,
}: {
  clienteId: string; inicial: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; onFechar: () => void; onSalvar: (c: CartaoGrafico) => Promise<void>;
}) {
  const [c, setC] = useState(inicial);
  const [op, setOp] = useState<Opcoes | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    opcoesGraficos({ data: { clienteId } }).then(setOp).catch((e) => toast.error(msg(e)));
  }, [clienteId]);
  const set = (p: Partial<CartaoGrafico>) => setC((x) => ({ ...x, ...p }));
  const [configStatus, setConfigStatus] = useState(false);
  // Status do lead é uma coluna como as outras: aparece na lista mesmo quando ainda não foi posicionada (antes ia ao fim).
  const colunasEditor: CartaoGrafico["colunas"] = c.colunas.some((f) => f.campo === CAMPO_STATUS_LEAD)
    ? c.colunas
    : [...c.colunas, { fonte: c.fonte === "card" ? "card" : "contato", campo: CAMPO_STATUS_LEAD } as CartaoGrafico["colunas"][number]];
  const fontes = op ? fontesDisponiveis(op.catalogo as any) : [];
  const tipos = op ? tiposDisponiveis(op.catalogo as any, c) : [];
  useEffect(() => {
    if (op && tipos.length && !tipos.includes(c.tipo)) set({ tipo: tipos[0] });
  }, [JSON.stringify(tipos)]); // eslint-disable-line react-hooks/exhaustive-deps
  const camposPor = (filtro?: (t: string) => boolean) =>
    (op?.catalogo ?? []).filter((g) => fontes.includes(g.fonte)).map((g) => ({ ...g, campos: g.campos.filter((x) => x.preenchidos > 0 && (!filtro || filtro(x.tipo))) })).filter((g) => g.campos.length);
  const refVal = (r?: CampoRef | null) => (r ? `${r.fonte}|${r.campo}` : "__nenhum");
  const deVal = (v: string): CampoRef | null => (v === "__nenhum" ? null : { fonte: v.split("|")[0] as FonteCampo, campo: v.split("|").slice(1).join("|") });
  const SelCampo = ({ valor, onMudar, nenhum, filtro }: { valor?: CampoRef | null; onMudar: (r: CampoRef | null) => void; nenhum?: string; filtro?: (t: string) => boolean }) => (
    <Select value={refVal(valor)} onValueChange={(v) => onMudar(deVal(v))}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {nenhum && <SelectItem value="__nenhum">{nenhum}</SelectItem>}
        {camposPor(filtro).map((g) => (
          <SelectGroup key={g.fonte}>
            <SelectLabel>{g.nome}</SelectLabel>
            {g.campos.map((x) => <SelectItem key={`${g.fonte}|${x.campo}`} value={`${g.fonte}|${x.campo}`}>{x.rotulo}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
  const ehData = (r: CampoRef) => r.campo === "criado_em" || op?.catalogo.find((g) => g.fonte === r.fonte)?.campos.find((x) => x.campo === r.campo)?.tipo === "data";
  const primeiraData = (): CampoRef | null => { const g = camposPor((t) => t === "data").find((x) => x.fonte === c.fonte) ?? camposPor((t) => t === "data")[0]; return g?.campos[0] ? { fonte: g.fonte, campo: g.campos[0].campo } : null; };
  const ehIndicador = c.medida === "indicador";
  const medidasOk = MEDIDAS.filter((m) => (m === "indicador" ? (op?.indicadores.length ?? 0) > 0 : m === "tempo_medio" ? fontes.includes("atendimento") : true));

  return (
    <Sheet open onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{ehTituloPadrao(inicial.titulo) ? "Novo bloco" : "Editar bloco"}</SheetTitle>
          <SheetDescription>A prévia usa o período e os filtros atuais da visão.</SheetDescription>
        </SheetHeader>
        {!op ? (
          <Skeleton className="mt-4 h-96 w-full" />
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-3">
              <div className="space-y-1"><Label>Título</Label><Input value={c.titulo} maxLength={80} onChange={(e) => set({ titulo: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Medida</Label>
                  <Select value={c.medida} onValueChange={(v) => set({ painel: undefined, medida: v as any, ...(v === "indicador" ? { indicador: op.indicadores[0]?.chave ?? null, dimensao: null, serie: null } : {}) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{medidasOk.map((m) => <SelectItem key={m} value={m}>{ROTULO_MEDIDA[m]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {ehIndicador ? (
                  <div className="space-y-1">
                    <Label>Indicador</Label>
                    <Select value={c.indicador ?? ""} onValueChange={(v) => set({ indicador: v, formato: (op.indicadores.find((x) => x.chave === v)?.formato as any) ?? "numero" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{op.indicadores.map((x) => <SelectItem key={x.chave} value={x.chave}>{x.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Fonte</Label>
                    <Select value={c.fonte} onValueChange={(v) => set({ painel: undefined, fonte: v as FonteCampo })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONTES_CATALOGO.filter((f) => fontes.includes(f.fonte)).map((f) => <SelectItem key={f.fonte} value={f.fonte}>{f.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {(c.medida === "soma" || c.medida === "media" || c.medida === "tempo_medio") && (
                <div className="space-y-1"><Label>Campo da medida</Label><SelCampo valor={c.campoMedida} onMudar={(r) => set({ campoMedida: r })} filtro={(t) => t === "numero" || t === "moeda"} /></div>
              )}
              {!ehIndicador && (
                <>
                  {c.tipo === "calendario" ? (
                    <>
                      <div className="space-y-1"><Label>Campo de data</Label><SelCampo valor={c.dimensao} onMudar={(r) => set({ dimensao: r })} filtro={(t) => t === "data"} /></div>
                      <div className="space-y-1">
                        <Label>Visualização inicial</Label>
                        <Select value={c.visualCalendario} onValueChange={(v) => set({ visualCalendario: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="mes">Mês</SelectItem><SelectItem value="semana">Semana</SelectItem><SelectItem value="dia">Dia</SelectItem><SelectItem value="agenda">Lista de agenda</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Campos na lista do dia</Label>
                        <SelCampo valor={null} onMudar={(r) => r && !c.camposLista.some((x) => x.fonte === r.fonte && x.campo === r.campo) && set({ camposLista: [...c.camposLista, r].slice(0, 8) })} nenhum="Adicionar campo…" />
                        <div className="flex flex-wrap gap-1">
                          {c.camposLista.map((f) => (
                            <button key={`${f.fonte}|${f.campo}`} type="button" className="rounded-full border px-2 py-0.5 text-xs" onClick={() => set({ camposLista: c.camposLista.filter((x) => x !== f) })}>
                              {op.catalogo.find((g) => g.fonte === f.fonte)?.campos.find((x) => x.campo === f.campo)?.rotulo ?? f.campo} ×
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1"><Label>Dimensão principal</Label><SelCampo valor={c.dimensao} onMudar={(r) => set({ dimensao: r })} nenhum="Nenhuma (só o total)" /></div>
                  )}
                  {c.dimensao && c.tipo !== "calendario" && <div className="space-y-1"><Label>Série (segunda dimensão)</Label><SelCampo valor={c.serie} onMudar={(r) => set({ serie: r })} nenhum="Nenhuma" /></div>}
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={c.tipo} onValueChange={(v) => { const titulo = ehTituloPadrao(c.titulo) ? tituloPadrao(v) : c.titulo; set(v === "calendario" ? { tipo: "calendario", titulo, serie: null, granularidade: "dia", dimensao: c.dimensao && ehData(c.dimensao) ? c.dimensao : primeiraData() } : { tipo: v as any, titulo }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{ROTULO_TIPO_GRAFICO[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Agrupar datas por</Label>
                  <Select value={c.granularidade} onValueChange={(v) => set({ granularidade: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="dia">Dia</SelectItem><SelectItem value="semana">Semana</SelectItem><SelectItem value="mes">Mês</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ordenar</Label>
                  <Select value={c.ordem} onValueChange={(v) => set({ ordem: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="valor_desc">Maior valor</SelectItem><SelectItem value="valor_asc">Menor valor</SelectItem><SelectItem value="rotulo">Nome</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Top N</Label>
                  <Input type="number" min={1} max={100} placeholder="Todos" value={c.topN ?? ""} onChange={(e) => set({ topN: e.target.value ? Math.max(1, Math.min(100, Number(e.target.value))) : null })} />
                </div>
                <div className="space-y-1">
                  <Label>Formato</Label>
                  <Select value={c.formato} onValueChange={(v) => set({ formato: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="numero">Número</SelectItem><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="moeda">Moeda</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tamanho inicial</Label>
                  <Select value={c.tamanho} onValueChange={(v) => set({ tamanho: v as any, largura: undefined })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="metade">Meia largura</SelectItem><SelectItem value="inteiro">Largura inteira</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              {c.tipo === "funil" && (
                <div className="space-y-1">
                  <Label>Modo do funil</Label>
                  <Select value={c.modoFunil} onValueChange={(v) => set({ modoFunil: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ranking">Ranking (% do total)</SelectItem><SelectItem value="etapas">Etapas (conversão entre etapas)</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {c.tipo === "dois_valores" && op.indicadores.length > 0 && (
                <div className="space-y-1">
                  <Label>Quantidade pelo indicador da Matriz</Label>
                  <Select value={c.indicador ?? "_"} onValueChange={(v) => set({ indicador: v === "_" ? null : v, fonte: v === "_" ? c.fonte : "card" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="_">Nenhum (registros criados no período)</SelectItem>{op.indicadores.map((x) => <SelectItem key={x.chave} value={x.chave}>{x.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {c.tipo === "dois_valores" && (
                <div className="space-y-1"><Label>Campo somado</Label><SelCampo valor={c.campoMedida} onMudar={(r) => set({ campoMedida: r })} filtro={(t) => t === "numero" || t === "moeda"} /></div>
              )}
              {(c.tipo === "matriz_utm" || c.tipo === "tabela_itens" || c.tipo === "calendario") && (() => {
                const k = c.tipo === "matriz_utm" ? "agrupar" : c.tipo === "tabela_itens" ? "colunas" : "camposData";
                const lista = c[k] as CampoRef[];
                const rot = c.tipo === "matriz_utm" ? "Campos de campanha de anúncio que agrupam as linhas" : c.tipo === "tabela_itens" ? "Colunas da tabela" : "Outros campos de data (quem vê alterna)";
                return (
                  <div className="space-y-1">
                    <Label>{rot}</Label>
                    <SelCampo valor={null} onMudar={(r) => r && (c.tipo !== "matriz_utm" || r.fonte === "utm") && !lista.some((x) => x.fonte === r.fonte && x.campo === r.campo) && set({ [k]: [...lista, r].slice(0, c.tipo === "tabela_itens" ? 24 : c.tipo === "calendario" ? 4 : 8) } as any)} filtro={c.tipo === "calendario" ? (t) => t === "data" : undefined} nenhum="Adicionar campo…" />
                    {c.tipo === "tabela_itens" ? (
                      <div className="space-y-1">
                        <ListaOrdenavel ids={colunasEditor.map((f) => `${f.fonte}|${f.campo}`)} onMover={(de, para) => set({ colunas: moverPara(colunasEditor, de, para) })}>
                        {(_id, i, alca) => {
                          const f = colunasEditor[i];
                          const status = f.campo === CAMPO_STATUS_LEAD;
                          const nome = status ? ROTULO_STATUS_PADRAO : (op.catalogo.find((g) => g.fonte === f.fonte)?.campos.find((x) => x.campo === f.campo)?.rotulo ?? f.campo);
                          const muda = (x: Partial<(typeof c.colunas)[number]>) => set({ colunas: colunasEditor.map((y, j) => (j === i ? { ...y, ...x } : y)) });
                          return (
                            <div>
                            <div className="flex items-center gap-1">
                              {alca}
                              <Checkbox checked={!f.oculta} aria-label={`Mostrar ${nome}`} onCheckedChange={(v) => muda({ oculta: v === false ? true : undefined })} />
                              <Input className="h-7 text-xs" value={f.rotulo ?? ""} placeholder={nome} maxLength={60} aria-label={`Nome da coluna ${nome}`} onChange={(e) => muda({ rotulo: e.target.value || undefined })} />
                              {status && <Button size="icon" variant={configStatus ? "secondary" : "ghost"} className="h-7 w-7 shrink-0" aria-pressed={configStatus} aria-label="Configurar Status do lead" title="Configurar origem e cores" onClick={() => setConfigStatus((v) => !v)}><Settings className="h-3 w-3" /></Button>}
                              <Button size="icon" variant={f.fixa ? "secondary" : "ghost"} className="h-7 w-7 shrink-0" title="Fixar à esquerda" aria-pressed={!!f.fixa} aria-label={`Fixar ${nome} à esquerda`} onClick={() => muda({ fixa: f.fixa ? undefined : true })}><Pin className="h-3 w-3" /></Button>
                              {i > 0 && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Subir ${nome}`} onClick={() => set({ colunas: moverColuna(colunasEditor, i, -1) })}><ArrowUp className="h-3 w-3" /></Button>}
                              {i < colunasEditor.length - 1 && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Descer ${nome}`} onClick={() => set({ colunas: moverColuna(colunasEditor, i, 1) })}><ArrowDown className="h-3 w-3" /></Button>}
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Remover ${nome}`} onClick={() => (status ? muda({ oculta: true }) : set({ colunas: colunasEditor.filter((_, j) => j !== i) }))}><X className="h-3 w-3" /></Button>
                            </div>
                            {status && configStatus && <ConfigStatusLead clienteId={clienteId} catalogo={op.catalogo} />}
                            </div>
                          );
                        }}
                        </ListaOrdenavel>
                      </div>
                    ) : (
                    <div className="flex flex-wrap gap-1">
                      {lista.map((f) => (
                        <button key={`${f.fonte}|${f.campo}`} type="button" className="rounded-full border px-2 py-0.5 text-xs" onClick={() => set({ [k]: lista.filter((x) => x !== f) } as any)}>
                          {op.catalogo.find((g) => g.fonte === f.fonte)?.campos.find((x) => x.campo === f.campo)?.rotulo ?? f.campo} ×
                        </button>
                      ))}
                    </div>
                    )}
                    {c.tipo === "tabela_itens" && <p className="text-xs text-muted-foreground">A coluna "Origem" (patrocinado, orgânico ou outro) entra sempre.</p>}
                  </div>
                );
              })()}
              {c.tipo === "matriz_utm" && <label className="flex items-center gap-2 text-sm"><Switch checked={c.soPatrocinados} onCheckedChange={(v) => set({ soPatrocinados: v })} /> Só patrocinados</label>}
              {c.tipo === "barras_empilhadas" && (
                <div className="space-y-1">
                  <Label>Medidas que quem vê alterna (até 3)</Label>
                  {c.medidasAlternaveis.map((m, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input className="h-8" value={m.rotulo} maxLength={40} onChange={(e) => set({ medidasAlternaveis: c.medidasAlternaveis.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)) })} />
                      <Select value={`${m.fonte}|${m.medida}`} onValueChange={(v) => { const [fonte, medida] = v.split("|"); set({ medidasAlternaveis: c.medidasAlternaveis.map((x, j) => (j === i ? { ...x, fonte: fonte as FonteCampo, medida: medida as any } : x)) }); }}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{FONTES_CATALOGO.filter((f) => fontes.includes(f.fonte)).flatMap((f) => (["contagem", "distinta"] as const).map((md) => <SelectItem key={`${f.fonte}|${md}`} value={`${f.fonte}|${md}`}>{f.nome}: {ROTULO_MEDIDA[md]}</SelectItem>))}</SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => set({ medidasAlternaveis: c.medidasAlternaveis.filter((_, j) => j !== i) })}>×</Button>
                    </div>
                  ))}
                  {c.medidasAlternaveis.length < 3 && <Button size="sm" variant="outline" onClick={() => set({ medidasAlternaveis: [...c.medidasAlternaveis, { rotulo: "Outra medida", fonte: c.fonte, medida: "contagem", campoMedida: null, serie: c.serie ?? null }] })}>Adicionar medida</Button>}
                </div>
              )}
              <label className="flex items-center gap-2 text-sm"><Switch checked={c.comparar} onCheckedChange={(v) => set({ comparar: v })} /> Comparar com o período anterior</label>
              <div className="space-y-1">
                <Label>Filtro fixo</Label>
                <p className="text-xs text-muted-foreground">Vale sempre para este bloco, inclusive no Exportar e na Elora IA. Quem vê enxerga um selo com cadeado, não remove e pode somar os próprios filtros.</p>
                <FiltroCampos clienteId={clienteId} filtros={c.filtros} onFiltros={(f) => set({ filtros: f })} fonteDaVisao={c.fonte} rotuloBotao="Filtro fixo" />
              </div>
            </div>
            <div className="min-w-0 lg:sticky lg:top-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia</p>
              <CartaoView clienteId={clienteId} cartao={c} periodo={periodo} filtrosVisao={filtrosVisao} previa />
            </div>
          </div>
        )}
        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button
            disabled={salvando || !c.titulo.trim() || (ehIndicador && !c.indicador)}
            onClick={async () => {
              setSalvando(true);
              try { await onSalvar(c); } finally { setSalvando(false); }
            }}
          >
            {salvando ? "Salvando…" : "Salvar gráfico"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- funil ---------------- */

/**
 * Funil no estilo do Elora App: faixas trapezoidais empilhadas e centradas, todas da mesma altura,
 * nome pequeno e valor grande dentro da faixa; painel à direita com a conversão final em destaque.
 */
function FunilCartao({ cartao, r, onClique }: { cartao: CartaoGrafico; r: ResultadoCartao; onClique?: (rotulo: string) => void }) {
  const faixas = funilTop(r.categorias, 8);
  const pcts = percentuaisFunil(faixas, cartao.modoFunil);
  const n = faixas.length;
  if (!n) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  const pctTxt = (v: number | null | undefined) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  // larguras de 100% (topo) a 34% (base), lineares, para todas as faixas terem a mesma altura
  const larg = (k: number) => 100 - (66 * k) / Math.max(1, n);
  const primeira = faixas[0]?.total ?? 0, ultima = faixas[n - 1]?.total ?? 0;
  const final = cartao.modoFunil === "etapas" ? (primeira ? (ultima / primeira) * 100 : null) : pcts[0] ?? null;
  const cor = (i: number, rot: string) => (rot === "Outras" ? { bg: "var(--muted)", fg: "var(--foreground)" } : { bg: `var(--chart-${(i % 5) + 1})`, fg: `var(--chart-${(i % 5) + 1}-foreground)` });
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch">
      <ol className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-label={cartao.titulo}>
        {faixas.map((f, i) => {
          const topo = larg(i), base = larg(i + 1), recuo = ((topo - base) / 2 / topo) * 100;
          const c = cor(i, f.rotulo);
          return (
            <li key={f.rotulo} className="flex w-full justify-center">
              <button
                type="button"
                disabled={!onClique || f.rotulo === "Outras"}
                onClick={() => onClique?.(f.rotulo)}
                title={`${f.rotulo}: ${fmt(f.total, cartao)} (${pcts[i] == null ? "início" : pctTxt(pcts[i])})`}
                className="flex h-14 min-w-0 flex-col items-center justify-center px-[12%] text-center transition-opacity enabled:hover:opacity-90"
                style={{ width: `${topo}%`, background: c.bg, color: c.fg, clipPath: `polygon(0 0, 100% 0, ${100 - recuo}% 100%, ${recuo}% 100%)` }}
              >
                <span className="block w-full truncate text-[11px] leading-tight">{f.rotulo}</span>
                <span className="block w-full truncate text-base font-bold leading-tight tabular-nums">{fmt(f.total, cartao)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <aside className="flex shrink-0 flex-col justify-between gap-2 rounded-lg border bg-muted/40 p-3 sm:w-44">
        <div>
          <p className="text-xs text-muted-foreground">{cartao.modoFunil === "etapas" ? "Conversão final" : "Maior fatia"}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{pctTxt(final)}</p>
          <p className="truncate text-[11px] text-muted-foreground" title={cartao.modoFunil === "etapas" ? `${faixas[0].rotulo} → ${faixas[n - 1].rotulo}` : faixas[0].rotulo}>
            {cartao.modoFunil === "etapas" ? `${faixas[0].rotulo} → ${faixas[n - 1].rotulo}` : faixas[0].rotulo}
          </p>
        </div>
        <ul className="space-y-0.5 text-[11px]">
          {faixas.map((f, i) => i > 0 || cartao.modoFunil === "ranking" ? (
            <li key={f.rotulo} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-muted-foreground" title={f.rotulo}>{f.rotulo}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{pctTxt(pcts[i])}</span>
            </li>
          ) : null)}
        </ul>
        <p className="text-[10px] text-muted-foreground">{cartao.modoFunil === "etapas" ? "% sobre a etapa anterior" : "% sobre o total"}</p>
      </aside>
    </div>
  );
}

/* ---------------- calendário ---------------- */

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (dia: string, n: number) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** Cor de cada tipo de compromisso: 1º campo de data = amarelo da marca (texto marinho), 2º = verde de sucesso. */
export const COR_TIPO_CALENDARIO = ["bg-agenda-consulta text-agenda-consulta-foreground", "bg-agenda-procedimento text-agenda-procedimento-foreground", "bg-accent text-accent-foreground", "bg-muted text-foreground"] as const;
const corTipo = (t: number) => COR_TIPO_CALENDARIO[t] ?? COR_TIPO_CALENDARIO[3];

function CalendarioCartao({ clienteId, cartao, filtrosVisao, menu, previa }: { clienteId: string; cartao: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; menu?: React.ReactNode; previa?: boolean }) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoCalendario>("todos");
  const [visual, setVisual] = useState(cartao.visualCalendario);
  const [ref, setRef] = useState(hojeSP());
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [segundaPrimeiro, setSegundaPrimeiro] = useState(false);
  const [podeMudarSemana, setPodeMudarSemana] = useState(false);
  useEffect(() => setVisual(cartao.visualCalendario), [cartao.visualCalendario]);
  useEffect(() => { if (fonteIncorporada) return; let vivo = true; lerInicioSemana({ data: { clienteId } }).then((r) => { if (vivo) { setSegundaPrimeiro(r.iniciaSegunda); setPodeMudarSemana(r.podeMudar); } }).catch(() => {}); return () => { vivo = false; }; }, [clienteId]);
  // detalhes do compromisso: lista do dia lida uma vez por dia e reaproveitada pelos cartões flutuantes
  const detalhes = useRef(new Map<string, Promise<ItemDia[]>>());
  useEffect(() => { detalhes.current.clear(); }, [clienteId, JSON.stringify(filtrosVisao), cartao.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const itensDia = (dia: string) => {
    let p = detalhes.current.get(dia);
    if (!p) { p = lerItensDia(clienteId, dia, cartao, filtrosVisao).then((r) => r.itens as ItemDia[]); detalhes.current.set(dia, p); }
    return p;
  };
  const per: Periodo = useMemo(() => {
    if (visual === "semana") { const de = inicioDaSemana(ref, segundaPrimeiro); return { de, ate: somarDias(de, 6) }; }
    if (visual === "dia") return { de: ref, ate: ref };
    const de = `${ref.slice(0, 7)}-01`;
    const fim = new Date(`${de}T12:00:00Z`); fim.setUTCMonth(fim.getUTCMonth() + 1); fim.setUTCDate(0);
    return { de, ate: iso(fim) };
  }, [visual, ref, segundaPrimeiro]);
  const { r, erro } = useResultado(clienteId, { ...cartao, granularidade: "dia" }, per, filtrosVisao, previa);
  if (r?.oculto) return null;
  const res = r?.r;
  const tipos = res?.tiposCalendario ?? [];
  const comEventos = !!res?.eventos;
  const eventos = filtrarPorTipo(res?.eventos ?? [], filtroTipo);
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e]);
  const valores = new Map((res?.categorias ?? []).map((c) => [c.rotulo, c.total]));
  const aguardando = new Set(res?.aguardando ?? []);
  const hoje = hojeSP();
  const abrirDia = (dia: string) => { setRef(dia); setVisual("dia"); };
  const navegar = (n: number) => setRef((d) => (visual === "semana" ? somarDias(d, 7 * n) : visual === "dia" ? somarDias(d, n) : (() => { const x = new Date(`${d.slice(0, 7)}-01T12:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return iso(x); })()));
  const fmtD = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { ...o, timeZone: "UTC" });
  const titulo = visual === "dia" ? fmtD(per.de, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : visual === "semana" ? (per.de.slice(0, 7) === per.ate.slice(0, 7) ? fmtD(per.de, { month: "long", year: "numeric" }) : `${fmtD(per.de, { month: "short" })} – ${fmtD(per.ate, { month: "short", year: "numeric" })}`)
    : fmtD(per.de, { month: "long", year: "numeric" });
  const nomesSemana = segundaPrimeiro ? SEMANA : [SEMANA[6], ...SEMANA.slice(0, 6)];
  const inicio = inicioDaSemana(per.de, segundaPrimeiro);
  const dias: string[] = [];
  for (let d = inicio; d <= per.ate || dias.length % 7 !== 0; d = somarDias(d, 1)) dias.push(d);
  const semanas = dias.length / 7;
  const celula = (dia: string) => {
    const fora = dia < per.de || dia > per.ate;
    const evs = porDia.get(dia) ?? [];
    const v = valores.get(dia);
    const ag = aguardando.has(dia) && dia <= hoje;
    const { mostrar, mais } = resumoDiaMes(evs, 3);
    return (
      <div key={dia} className={`flex min-h-20 min-w-0 flex-col gap-0.5 overflow-hidden border-b border-r p-1 text-xs ${fora ? "bg-muted/40 text-muted-foreground" : ""}`}>
        <button type="button" onClick={() => abrirDia(dia)} aria-label={`Abrir ${dia.split("-").reverse().join("/")}`}
          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium hover:bg-muted ${dia === hoje ? "bg-primary text-primary-foreground hover:bg-primary" : ""}`}>
          {Number(dia.slice(8))}
        </button>
        {comEventos ? (
          <>
            {mostrar.map((e) => <EventoFlutuante key={e.id} e={e} tipos={tipos} itensDia={itensDia} />)}
            {mais > 0 && <button type="button" className="rounded px-1 text-left text-[11px] font-semibold text-muted-foreground hover:bg-muted" onClick={() => abrirDia(dia)}>+{mais} mais</button>}
          </>
        ) : (
          <span className="mt-auto text-center font-semibold tabular-nums">{v ? fmt(v, cartao) : ""}</span>
        )}
      </div>
    );
  };
  const diasAgenda = comEventos ? [...porDia.keys()] : [...valores.entries()].filter(([, v]) => v).map(([d]) => d);
  const VISOES = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["agenda", "Agenda"]] as const;
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <h3 className="mr-2 text-sm font-semibold">{cartao.titulo}</h3>
          <SelosFixos clienteId={clienteId} filtros={cartao.filtros} />
          <Button size="sm" variant="outline" className="h-7" onClick={() => setRef(hoje)}>Hoje</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Anterior" onClick={() => navegar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Próximo" onClick={() => navegar(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium capitalize">{titulo}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {tipos.length > 1 && (
            <Select value={String(filtroTipo)} onValueChange={(v) => setFiltroTipo(v === "todos" ? "todos" : Number(v))}>
              <SelectTrigger className="h-7 w-auto text-xs" aria-label="Tipo de compromisso"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tipos.map((t, i) => <SelectItem key={i} value={String(i)}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Visualização">
            {VISOES.map(([k, rot]) => <Button key={k} size="sm" variant={visual === k ? "secondary" : "ghost"} aria-pressed={visual === k} className="h-6 px-2 text-xs" onClick={() => setVisual(k)}>{rot}</Button>)}
          </div>
          {podeMudarSemana && !previa && (
            <Select value={segundaPrimeiro ? "seg" : "dom"} onValueChange={(v) => { const s = v === "seg"; setSegundaPrimeiro(s); salvarInicioSemana({ data: { clienteId, iniciaSegunda: s } }).catch((e) => toast.error(msg(e))); }}>
              <SelectTrigger className="h-7 w-auto text-xs" aria-label="Semana começa"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="dom">Semana: domingo</SelectItem><SelectItem value="seg">Semana: segunda</SelectItem></SelectContent>
            </Select>
          )}
          {menu}
        </div>
      </header>
      {tipos.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs" aria-label="Legenda">
          {tipos.map((t, i) => (filtroTipo === "todos" || filtroTipo === i) && <span key={i} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${corTipo(i)}`} />{t}</span>)}
        </div>
      )}
      {erro && !r ? (
        <p className="text-sm text-muted-foreground">Não foi possível calcular agora.</p>
      ) : !r ? (
        <Skeleton className="h-64 w-full" />
      ) : (visual === "dia" || visual === "semana") && comEventos ? (
        <GradeHoras dias={visual === "dia" ? [per.de] : Array.from({ length: 7 }, (_, i) => somarDias(per.de, i))} eventos={eventos} tipos={tipos} itensDia={itensDia} onAbrirDia={abrirDia} onListaDia={setDiaAberto} />
      ) : visual === "agenda" || visual === "dia" || visual === "semana" ? (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto text-sm">
          {diasAgenda.filter((d) => d >= per.de && d <= per.ate).map((dia) => (
            <li key={dia} className="flex gap-3 py-2">
              <button type="button" onClick={() => abrirDia(dia)} className={`flex w-14 shrink-0 flex-col items-center rounded-md py-0.5 hover:bg-muted ${dia === hoje ? "text-primary" : ""}`}>
                <span className="text-lg font-semibold leading-none">{Number(dia.slice(8))}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{fmtD(dia, { month: "short", weekday: "short" })}</span>
              </button>
              {comEventos ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1">{(porDia.get(dia) ?? []).map((e) => <EventoFlutuante key={e.id} e={e} tipos={tipos} itensDia={itensDia} lista />)}</div>
              ) : <span className="ml-auto tabular-nums">{fmt(valores.get(dia) ?? 0, cartao)}</span>}
            </li>
          ))}
          {!diasAgenda.some((d) => d >= per.de && d <= per.ate) && <li className="py-2 text-muted-foreground">Nenhum compromisso neste período.</li>}
        </ul>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden rounded-md border-l border-t" style={{ gridTemplateRows: `auto repeat(${semanas}, minmax(5rem, 1fr))` }}>
          {nomesSemana.map((d) => <span key={d} className="border-b border-r py-1 text-center text-[11px] uppercase text-muted-foreground">{d}</span>)}
          {dias.map(celula)}
        </div>
      )}
      {res && <p className="mt-2 text-xs text-muted-foreground">{comEventos ? `${eventos.length.toLocaleString("pt-BR")} compromisso(s) no período` : `Total no período: ${fmt(res.total, cartao)}`}</p>}
      {diaAberto && <ItensDoDia clienteId={clienteId} cartao={cartao} dia={diaAberto} filtrosVisao={filtrosVisao} filtroTipo={filtroTipo} tipos={tipos} onFechar={() => setDiaAberto(null)} />}
    </section>
  );
}

/** Compromisso clicável: abre um cartão flutuante com hora, nome, tipo, telefone, procedimento e valor. */
function EventoFlutuante({ e, tipos, itensDia, lista, className, style, children }: { e: EventoCalendario; tipos: string[]; itensDia: (dia: string) => Promise<ItemDia[]>; compacto?: boolean; lista?: boolean; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const [item, setItem] = useState<ItemDia | null | undefined>(undefined);
  const abrir = (o: boolean) => {
    if (!o || item !== undefined) return;
    itensDia(e.dia).then((xs) => setItem(xs.find((x) => x.id === e.id) ?? xs.find((x) => x.tipo === e.tipo && x.nome === e.nome && x.hora === e.hora) ?? null)).catch(() => setItem(null));
  };
  const rotulo = `${e.hora ? `${e.hora}, ` : ""}${e.nome}, ${tipos[e.tipo] ?? ""}`;
  return (
    <Popover onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={rotulo} title={rotulo} style={style}
          className={className ?? `block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium leading-tight ${corTipo(e.tipo)} ${lista ? "py-1 text-xs" : ""}`}>
          {children ?? <>{e.hora && <span className="tabular-nums">{e.hora} </span>}{e.nome}{lista && tipos[e.tipo] ? <span className="opacity-80"> · {tipos[e.tipo]}</span> : null}</>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3 text-sm">
        <div className="flex items-start gap-2">
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${corTipo(e.tipo)}`} />
          <div className="min-w-0">
            <p className="break-words font-semibold">{e.nome}</p>
            <p className="text-xs text-muted-foreground">{new Date(`${e.dia}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{e.hora ? ` · ${e.hora}` : ""}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Tipo</dt><dd>{tipos[e.tipo] ?? ""}</dd>
          {item === undefined ? <><dt className="text-muted-foreground">Detalhes</dt><dd><Skeleton className="h-3 w-24" /></dd></> : item && <>
            <dt className="text-muted-foreground">Telefone</dt><dd className="tabular-nums">{item.telefone}</dd>
            {Object.entries(item.campos).map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{rotuloCorrido(k.split("|")[1] ?? k)}</dt><dd className="break-words">{v}</dd></Fragment>)}
            {item.valor != null && <><dt className="text-muted-foreground">Valor</dt><dd className="tabular-nums">{formatarMoeda(item.valor)}</dd></>}
          </>}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

const ALTURA_HORA = 48;

/** Grade por hora (Dia/Semana, estilo Google Agenda): blocos no horário com altura da duração, linha da hora atual. */
function GradeHoras({ dias, eventos, tipos, itensDia, onAbrirDia, onListaDia }: { dias: string[]; eventos: EventoCalendario[]; tipos: string[]; itensDia: (dia: string) => Promise<ItemDia[]>; onAbrirDia: (dia: string) => void; onListaDia: (dia: string) => void }) {
  const doPeriodo = eventos.filter((e) => dias.includes(e.dia));
  const r = reguaHoras(doPeriodo);
  const altura = (r.horas.length - 1) * ALTURA_HORA;
  const hoje = hojeSP();
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => { const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Sao_Paulo", hour12: false }).split(":").map(Number); setAgora(h + m / 60); };
    calc(); const t = setInterval(calc, 60_000); return () => clearInterval(t);
  }, []);
  const colunas = `3rem repeat(${dias.length}, minmax(${dias.length > 1 ? "6rem" : "0"}, 1fr))`;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: colunas, minWidth: dias.length > 1 ? "48rem" : undefined }}>
        <span />
        {dias.map((d) => (
          <button key={d} type="button" onClick={() => (dias.length > 1 ? onAbrirDia(d) : onListaDia(d))} className="flex flex-col items-center pb-1" aria-label={dias.length > 1 ? `Abrir ${d.split("-").reverse().join("/")}` : "Ver lista do dia"}>
            <span className={`text-[10px] uppercase ${d === hoje ? "font-semibold text-primary" : "text-muted-foreground"}`}>{new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${d === hoje ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{Number(d.slice(8))}</span>
          </button>
        ))}
        {r.semHora.length > 0 && (
          <>
            <span className="pr-1 text-right text-[10px] text-muted-foreground">sem hora</span>
            {dias.map((d) => (
              <div key={d} className="flex flex-col gap-0.5 border-b border-l p-0.5">
                {r.semHora.filter((e) => e.dia === d).map((e) => <EventoFlutuante key={e.id} e={e} tipos={tipos} itensDia={itensDia} />)}
              </div>
            ))}
          </>
        )}
        <div className="relative" style={{ height: altura }}>
          {r.horas.map((h, i) => <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ top: i * ALTURA_HORA }}>{String(h).padStart(2, "0")}:00</span>)}
        </div>
        {dias.map((d) => (
          <div key={d} className={`relative border-l ${d === hoje ? "bg-primary/5" : ""}`} style={{ height: altura }}>
            {r.horas.map((h, i) => <span key={h} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: i * ALTURA_HORA }} />)}
            {r.posicoes.filter((p) => p.e.dia === d).map((p) => (
              <EventoFlutuante key={p.e.id} e={p.e} tipos={tipos} itensDia={itensDia}
                className={`absolute z-10 overflow-hidden rounded px-1 py-0.5 text-left text-[11px] font-medium leading-tight shadow-sm ring-1 ring-card ${corTipo(p.e.tipo)}`}
                style={{ top: p.pos * ALTURA_HORA, height: Math.max(18, p.duracao * ALTURA_HORA - 2), left: `calc(${(p.coluna / p.colunas) * 100}% + 2px)`, width: `calc(${100 / p.colunas}% - 4px)` }}>
                <span className="block truncate">{p.e.nome}</span>
                {p.duracao * ALTURA_HORA >= 30 && <span className="block truncate tabular-nums opacity-80">{p.e.hora}</span>}
              </EventoFlutuante>
            ))}
            {d === hoje && agora != null && agora >= r.inicio && agora <= r.fim && (
              <span aria-label="Agora" className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-destructive" style={{ top: (agora - r.inicio) * ALTURA_HORA }}>
                <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-destructive" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItensDoDia({ clienteId, cartao, dia, filtrosVisao, filtroTipo, tipos, onFechar }: { clienteId: string; cartao: CartaoGrafico; dia: string; filtrosVisao: FiltroCampo[]; filtroTipo: FiltroTipoCalendario; tipos: string[]; onFechar: () => void }) {
  const [todos, setTodos] = useState<ItemDia[] | null>(null);
  useEffect(() => {
    let vivo = true;
    lerItensDia(clienteId, dia, cartao, filtrosVisao).then((r) => vivo && setTodos(r.itens as ItemDia[])).catch((e) => { toast.error(msg(e)); vivo && setTodos([]); });
    return () => { vivo = false; };
  }, [clienteId, dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const itens = todos ? filtrarPorTipo(todos, filtroTipo) : null;
  const rotulos = Object.fromEntries(cartao.camposLista.map((f) => [`${f.fonte}|${f.campo}`, f.rotulo || rotuloCorrido(f.campo)]));
  const extras = Object.keys(rotulos).filter((k) => itens?.some((i) => k in i.campos));
  const temValor = itens?.some((i) => i.valor != null);
  const resultado: ResultadoCartao = {
    categorias: [], series: [], total: itens?.length ?? 0, anterior: null, linhas: itens?.length ?? 0,
    colunasItens: [{ chave: "data", rotulo: "Data e hora" }, { chave: "nome", rotulo: "Nome" }, { chave: "tipo", rotulo: "Tipo" }, { chave: "telefone", rotulo: "Telefone" }, ...extras.map((chave) => ({ chave, rotulo: rotulos[chave] })), ...(temValor ? [{ chave: "valor", rotulo: "Valor" }] : [])],
    itens: (itens ?? []).map((i) => ({ id: i.id, valores: { ...i.campos, data: i.data, nome: i.nome, tipo: tipos[i.tipo] ?? "", telefone: i.telefone, valor: formatarMoeda(i.valor) } })),
    etiquetas: ["tipo"],
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{cartao.titulo} · {dia.split("-").reverse().join("/")}</SheetTitle>
          <SheetDescription>{cartao.medida === "indicador" ? "A lista do dia existe para calendários de campo de data." : itens ? `${itens.length} compromisso(s)` : "Carregando…"}</SheetDescription>
        </SheetHeader>
        {!itens ? <Skeleton className="mt-4 h-40 w-full" /> : !itens.length ? (
          <p className="mt-6 text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
        ) : (
          <div className="mt-4"><TabelaItens cartao={cartao} r={resultado} /></div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Prévia ao vivo de um cartão (últimos 30 dias), usada pelo assistente de configuração. */
export function PreviaCartao({ clienteId, cartao }: { clienteId: string; cartao: CartaoGrafico }) {
  const periodo = useMemo(() => { const ate = hojeSP(); return { de: somarDias(ate, -29), ate }; }, []);
  return <CartaoView clienteId={clienteId} cartao={cartao} periodo={periodo} filtrosVisao={[]} previa />;
}

/* ---------------- tabela de itens ---------------- */

/** URL vira link (nova aba, texto curto, endereço completo no tooltip); o resto é texto. */
function celulaTexto(v: string) {
  if (!ehUrl(v)) return v;
  return <a href={v.trim()} target="_blank" rel="noopener noreferrer" title={v.trim()} className="text-primary underline underline-offset-2 hover:text-primary/80">{textoLink(v.trim())}</a>;
}

/** Uma linha por contato/card: ordenar, agrupar, ocultar colunas, paginar e exportar (CSV, só o que está visível). */
export function TabelaItens({ cartao, r, ordemInicial = null }: { cartao: Pick<CartaoGrafico, "titulo"> & Partial<Pick<CartaoGrafico, "id" | "ordemTabela">>; r: ResultadoCartao; ordemInicial?: OrdemTabela }) {
  const salvarOrdem = useContext(SalvarOrdemCtx);
  const padraoOrdem: OrdemTabela = cartao.ordemTabela !== undefined ? cartao.ordemTabela ?? null : ordemInicial;
  const cols = r.colunasItens ?? [];
  const chaveCols = cols.map((c) => `${c.chave}:${c.oculta ? 1 : 0}${c.fixa ? 1 : 0}`).join("|");
  // Quem vê ajusta as colunas aqui sem gravar; a configuração salva do bloco é o ponto de partida.
  const [estado, setEstado] = useState<EstadoColunas>(() => estadoInicial(cols));
  useEffect(() => setEstado(estadoInicial(cols)), [chaveCols]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ordem, setOrdem] = useState<OrdemTabela>(padraoOrdem);
  useEffect(() => setOrdem(padraoOrdem), [JSON.stringify(padraoOrdem)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [agrupar, setAgrupar] = useState<string>("");
  const [pagina, setPagina] = useState(0);
  const vis = colunasVisiveis(cols, estado);
  const etiquetas = new Set(r.etiquetas ?? []);
  const linhas = useMemo(() => {
    const l = [...(r.itens ?? [])];
    if (ordem) l.sort((a, b) => compararValores(a.brutos?.[ordem.col] ?? a.valores[ordem.col], b.brutos?.[ordem.col] ?? b.valores[ordem.col], ordem.desc));
    // agrupar: grupos na ordem do funil quando houver; linha sem valor recebe "Sem informação" e vai para o fim
    if (agrupar) l.sort((a, b) => compararGrupo(a.valores[agrupar] ?? "", b.valores[agrupar] ?? "", r.ordensColunas?.[agrupar]));
    return l;
  }, [r, ordem, agrupar]);
  const POR = 25;
  const paginas = Math.max(1, Math.ceil(linhas.length / POR));
  const pag = linhas.slice(pagina * POR, pagina * POR + POR);
  const exportar = (f: FormatoExportar) => {
    void exportarMatriz(f, vis.map((c) => c.rotulo), linhas.map((l) => vis.map((c) => l.valores[c.chave] ?? "")), cartao.titulo);
  };
  if (!linhas.length) return <p className="text-sm text-muted-foreground">Nenhum item no período.</p>;
  const numericas = new Set(vis.filter((c) => !etiquetas.has(c.chave) && colunaNumerica(linhas.map((l) => l.valores[c.chave]))).map((c) => c.chave));
  const LARG_FIXA = 160;
  const fixas = vis.filter((c) => c.fixa);
  const estiloFixa = (chave: string) => { const i = fixas.findIndex((c) => c.chave === chave); return i < 0 ? undefined : { left: i * LARG_FIXA, minWidth: LARG_FIXA, maxWidth: LARG_FIXA }; };
  const chip = (chave: string, v: string) => {
    const est = estiloCor(r.coresColunas?.[chave]?.[v]);
    return <span key={v} className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${est ? "" : corEtiqueta(v, r.ordensColunas?.[chave])}`} style={est} title={v}>{v}</span>;
  };
  const celula = (chave: string, v: string) => {
    if (!v) return celulaTexto(v);
    if (etiquetas.has(chave)) return chip(chave, v);
    // Etiquetas do contato com cor do Elora App: uma etiqueta colorida por valor.
    if (chave === "contato|etiquetas" && r.coresColunas?.[chave]) return <span className="flex flex-wrap gap-1">{v.split(/,\s*/).filter(Boolean).map((x) => chip(chave, x))}</span>;
    return celulaTexto(v);
  };
  return (
    <div className="space-y-2">
      <BarraTabela colunas={cols} estado={estado} onEstado={setEstado} padrao={estadoInicial(cols)}
        agruparOpcoes={vis} agrupar={agrupar} onAgrupar={setAgrupar} onExportar={fonteIncorporada ? undefined : exportar}
        extras={salvarOrdem && cartao.id && JSON.stringify(ordem) !== JSON.stringify(padraoOrdem) ? <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => salvarOrdem(cartao.id!, ordem)}>Salvar ordem como padrão</Button> : undefined} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr>{vis.map((c) => (
            <th key={c.chave} style={estiloFixa(c.chave)} className={`whitespace-nowrap border-b px-2 py-1.5 font-medium ${alinhamento(numericas.has(c.chave))} ${c.fixa ? "sticky z-10 truncate bg-card" : ""}`}>
              <button type="button" aria-sort={ordem?.col === c.chave ? (ordem.desc ? "descending" : "ascending") : "none"} title="Ordenar" className="inline-flex items-center gap-1" onClick={() => { setOrdem((o) => cicloOrdem(o, c.chave, padraoOrdem)); setPagina(0); }}>{c.rotulo} {ordem?.col === c.chave && (ordem.desc ? <ArrowDown className="h-3 w-3" aria-label="decrescente" /> : <ArrowUp className="h-3 w-3" aria-label="crescente" />)}</button>{" "}<InfoTitulo titulo={c.rotulo} texto={textoColunaOuAuto(c.rotulo)} />
            </th>
          ))}</tr></thead>
          <tbody>
            {pag.map((l, i) => {
              const novoGrupo = agrupar && (i === 0 ? true : pag[i - 1].valores[agrupar] !== l.valores[agrupar]);
              return [
                novoGrupo ? <tr key={`g${l.id}`}><td colSpan={vis.length} className="bg-muted px-2 py-1 font-semibold">{l.valores[agrupar] || NAO_DEFINIDO}</td></tr> : null,
                <tr key={l.id} className="border-b last:border-0">{vis.map((c) => <td key={c.chave} style={estiloFixa(c.chave)} className={`max-w-56 truncate px-2 py-1.5 ${alinhamento(numericas.has(c.chave))} ${c.fixa ? "sticky z-10 bg-card" : ""}`}>{celula(c.chave, l.valores[c.chave] ?? "")}</td>)}</tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex flex-wrap gap-x-3">
          <span className="font-semibold text-foreground">{linhas.length.toLocaleString("pt-BR")} itens</span>
          {r.resumoTipos?.map((t) => <span key={t.rotulo}>{t.rotulo}: {t.qtd.toLocaleString("pt-BR")}{t.soma != null ? ` · ${formatarMoeda(t.soma)}` : ""}</span>)}
        </span>
        {paginas > 1 && (
          <span className="flex items-center gap-1">
            {pagina > 0 && <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Página anterior" onClick={() => setPagina((p) => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>}
            {pagina + 1}/{paginas}
            {pagina < paginas - 1 && <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Próxima página" onClick={() => setPagina((p) => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>}
          </span>
        )}
      </div>
    </div>
  );
}
