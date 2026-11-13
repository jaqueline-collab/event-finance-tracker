import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, GripVertical, MoreHorizontal, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FiltroCampos } from "@/components/filtro-campos";
import type { FiltroCampo, FonteCampo } from "@/lib/campos-elora";
import { FONTES_CATALOGO } from "@/lib/campos-elora";
import { calcularCartao, itensDiaCalendario, moverCartaoVisao, opcoesGraficos, salvarCartoesVisao } from "@/lib/graficos.functions";
import { desfazer, empurrar, encaixar, historico, LARGURA_GRADE_PX, layoutPadrao, LINHA_PX, redimensionar, refazer, reordenar, tamanhoDe, type Historico } from "@/lib/layout-blocos";
import {
  fontesDisponiveis, MEDIDAS, type ItemDia, novoCartao, ROTULO_MEDIDA, ROTULO_TIPO_GRAFICO, tiposDisponiveis, type CartaoGrafico, type CampoRef, type ResultadoCartao,
} from "@/lib/graficos";
import { formatarDuracao, type Periodo } from "@/lib/painel-visual";
import { NAO_DEFINIDO } from "@/lib/nao-definido";
import { MarcaEstimativa } from "@/components/marca-estimativa";

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)", "var(--muted-foreground)"];
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
type Opcoes = Awaited<ReturnType<typeof opcoesGraficos>>;

function fmt(v: number | null | undefined, c: Pick<CartaoGrafico, "formato" | "medida">) {
  if (v == null || !Number.isFinite(v)) return "—";
  if (c.medida === "tempo_medio") return formatarDuracao(v);
  if (c.formato === "moeda") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (c.formato === "percentual") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: c.medida === "media" ? 1 : 0 });
}

/** Grade de cartões configuráveis de uma visão. Cliente vê pronto; super admin edita em modo Editar. */
export function CartoesGraficos({
  clienteId, visaoId, iniciais, editando, podeEditar, periodo, filtrosVisao, onFiltroGrafico, outrasVisoes, novoChave,
}: {
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
  const [arrastando, setArrastando] = useState<string | null>(null);
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
  const soltar = (alvo: string) => {
    if (!arrastando || arrastando === alvo) return;
    const l = reordenar(cartoes, arrastando, alvo);
    setArrastando(null);
    void gravar(l);
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
          <Button size="sm" variant="outline" className="h-8" disabled={!hist.passado.length} onClick={() => void voltar(desfazer(hist))}><Undo2 className="mr-1 h-4 w-4" />Desfazer</Button>
          <Button size="sm" variant="outline" className="h-8" disabled={!hist.futuro.length} onClick={() => void voltar(refazer(hist))}><Redo2 className="mr-1 h-4 w-4" />Refazer</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => void gravar(layoutPadrao(cartoes), "Layout padrão restaurado.")}><RotateCcw className="mr-1 h-4 w-4" />Restaurar layout padrão da visão</Button>
          {!larga && <span className="text-xs text-muted-foreground">Em telas estreitas cada bloco ocupa a linha toda; redimensione numa tela larga.</span>}
        </div>
      )}
      {cartoes.length > 0 && (
        <div ref={grade} className="grid grid-cols-1 gap-4" style={larga ? { gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridAutoRows: `minmax(${LINHA_PX - 16}px, auto)` } : undefined}>
          {cartoes.map((c) => {
            const t = previa?.id === c.id ? previa : tamanhoDe(c);
            return (
            <div
              key={c.id}
              className={`group relative min-w-0 ${arrastando === c.id ? "opacity-50" : ""} ${editavel ? "rounded-xl ring-primary/40 hover:ring-2" : ""}`}
              style={larga ? { gridColumn: `span ${t.largura} / span ${t.largura}`, gridRow: `span ${t.altura} / span ${t.altura}`, minHeight: t.altura * LINHA_PX - 16 } : undefined}
              draggable={editavel}
              onDragStart={() => setArrastando(c.id)}
              onDragOver={(e) => editavel && e.preventDefault()}
              onDrop={() => soltar(c.id)}
              onDragEnd={() => setArrastando(null)}
            >
              <CartaoView
                clienteId={clienteId}
                cartao={c}
                periodo={periodo}
                filtrosVisao={filtrosVisao}
                onFiltroGrafico={onFiltroGrafico}
                menu={
                  editavel ? (
                    <div className="flex items-center gap-1 rounded-md bg-card/90 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-label="Arrastar para reordenar" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opções do gráfico">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditor(c)}>Editar</DropdownMenuItem>
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
              {editavel && larga && (
                <>
                  <span role="separator" aria-label="Redimensionar largura" className="absolute inset-y-3 -right-1.5 w-3 cursor-ew-resize rounded opacity-0 hover:bg-primary/30 group-hover:opacity-100" onPointerDown={(e) => iniciarResize(e, c, "x")} />
                  <span role="separator" aria-label="Redimensionar altura" className="absolute inset-x-3 -bottom-1.5 h-3 cursor-ns-resize rounded opacity-0 hover:bg-primary/30 group-hover:opacity-100" onPointerDown={(e) => iniciarResize(e, c, "y")} />
                  <span role="separator" aria-label="Redimensionar" className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-primary bg-card opacity-0 group-hover:opacity-100" onPointerDown={(e) => iniciarResize(e, c, "xy")} />
                  {previa?.id === c.id && <span className="absolute right-2 top-2 rounded bg-primary px-1.5 text-xs text-primary-foreground">{t.largura}/12 · {t.altura}</span>}
                </>
              )}
            </div>
            );
          })}
        </div>
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

function useResultado(clienteId: string, cartao: CartaoGrafico, periodo: Periodo, filtrosVisao: FiltroCampo[], previa = false) {
  const [r, setR] = useState<{ oculto: boolean; r: ResultadoCartao | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const chave = JSON.stringify([cartao, periodo, filtrosVisao]);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      calcularCartao({ data: { clienteId, de: periodo.de, ate: periodo.ate, cartao, filtrosVisao, previa } })
        .then((x: any) => vivo && (setR({ oculto: Boolean(x.oculto), r: x.r ?? null }), setErro(null)))
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
  const efetivo = cartao.painel === "leads-por" ? { ...cartao, dimensao: dim } : cartao;
  const { r, erro } = useResultado(clienteId, efetivo, periodo, filtrosVisao, previa);
  if (r?.oculto) return null;
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{cartao.titulo}</h3>
        <div className="flex items-center gap-1">
          {cartao.painel === "leads-por" && <Select value={dim?.campo ?? "origem"} onValueChange={(campo) => setDim({ fonte: campo === "canal" ? "atendimento" : campo === "campaign" ? "utm" : "contato", campo })}>
            <SelectTrigger className="h-8 w-auto" aria-label="Dimensão da rosca"><SelectValue /></SelectTrigger>
            <SelectContent>{[["origem", "Origem"], ["canal", "Canal"], ["etiquetas", "Etiqueta"], ["campaign", "Campanha"]].map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
          </Select>}
          {menu}
        </div>
      </header>
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
      {r?.r && r.r.estimados.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <MarcaEstimativa desde={r.r.primeiraLeitura} />
          {r.r.estimados.length} dia(s) estimado(s), fora do total.
        </p>
      )}
      {r?.r?.cobertura && r.r.cobertura !== "confirmado" && <p className="mt-2 text-xs text-muted-foreground">{r.r.cobertura} · cobertura diária não confirmada</p>}
    </section>
  );
}

function Grafico({ cartao: c, r, onClique }: { cartao: CartaoGrafico; r: ResultadoCartao; onClique?: (rotulo: string) => void }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const dados = useMemo(() => r.categorias.map((x) => ({ rotulo: x.rotulo, total: x.total, ...x.valores })), [r]);
  const series = r.series.filter((s) => !ocultas.includes(s));
  const legenda = r.series.length > 1 ? <Legend onClick={(e: any) => setOcultas((o) => (o.includes(e.value) ? o.filter((x) => x !== e.value) : [...o, e.value]))} wrapperStyle={{ cursor: "pointer", fontSize: 12 }} /> : null;
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
          <p className={`mt-1 flex items-center gap-1 text-sm ${varia == null ? "text-muted-foreground" : bom ? "text-primary" : "text-destructive"}`}>
            {varia != null && (varia >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
            {varia == null ? "Sem base no período anterior" : `${varia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior (${fmt(r.anterior, c)})`}
          </p>
        )}
      </div>
    );
  }
  if (c.tipo === "tabela") return <TabelaCartao cartao={c} r={r} />;
  if (c.tipo === "mapa") return <MapaCartao cartao={c} r={r} onClique={onClique} />;
  if (!dados.length) return <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        {c.tipo === "pizza" || c.tipo === "rosca" ? (
          <PieChart>
            {tip}
            <Pie data={dados} dataKey="total" nameKey="rotulo" innerRadius={c.tipo === "rosca" ? "55%" : 0} outerRadius="85%" onClick={clique} className={onClique ? "cursor-pointer" : ""}>
              {dados.map((d, i) => <Cell key={d.rotulo} fill={d.rotulo === NAO_DEFINIDO ? "var(--muted)" : CORES[i % CORES.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : c.tipo === "funil" ? (
          <FunnelChart>
            {tip}
            <Funnel dataKey="total" nameKey="rotulo" data={dados.map((d, i) => ({ ...d, fill: CORES[i % CORES.length] }))} isAnimationActive={false} onClick={clique}>
              <LabelList position="right" dataKey="rotulo" fill="var(--foreground)" fontSize={11} />
            </Funnel>
          </FunnelChart>
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
  const [pagina, setPagina] = useState(0);
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({ col: "total", desc: true });
  const [ocultas, setOcultas] = useState<string[]>([]);
  const cols = (c.painel === "atendentes" ? r.series : r.series.length > 1 ? [...r.series, "total"] : ["total"]).filter((x) => !ocultas.includes(x));
  const linhas = [...r.categorias].sort((a, b) => {
    const x = ordem.col === "rotulo" ? a.rotulo : ordem.col === "total" ? a.total : (a.valores[ordem.col] ?? 0);
    const y = ordem.col === "rotulo" ? b.rotulo : ordem.col === "total" ? b.total : (b.valores[ordem.col] ?? 0);
    const s = x < y ? -1 : x > y ? 1 : 0;
    return ordem.desc ? -s : s;
  });
  const paginas = Math.max(1, Math.ceil(linhas.length / 20));
  const vis = linhas.slice(pagina * 20, pagina * 20 + 20);
  const th = (col: string, rot: string) => (
    <th className="whitespace-nowrap border-b px-2 py-1.5 text-right font-medium first:text-left">
      <button type="button" className="inline-flex items-center gap-1" onClick={() => setOrdem((o) => ({ col, desc: o.col === col ? !o.desc : true }))}>
        {rot} {ordem.col === col && (ordem.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );
  return (
    <div className="space-y-2">
      {r.series.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {[...r.series, "total"].map((s) => (
            <button key={s} type="button" onClick={() => setOcultas((o) => (o.includes(s) ? o.filter((x) => x !== s) : [...o, s]))} className={`rounded-full border px-2 py-0.5 text-xs ${ocultas.includes(s) ? "text-muted-foreground line-through" : ""}`}>
              {s === "total" ? "Total" : s}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {th("rotulo", c.dimensao ? "Item" : "")}
              {cols.map((x) => th(x, x === "total" ? "Total" : x))}
            </tr>
          </thead>
          <tbody>
            {vis.map((l) => (
              <tr key={l.rotulo} className="border-b last:border-0">
                <td className="px-2 py-1.5">{l.rotulo}</td>
                {cols.map((x) => <td key={x} className="px-2 py-1.5 text-right tabular-nums">{x === "Proporção (%)" ? `${(l.valores[x] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : fmt(x === "total" ? l.total : l.valores[x], c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Button size="sm" variant="ghost" className="h-7" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
          {pagina + 1} de {paginas}
          <Button size="sm" variant="ghost" className="h-7" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
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
          <SheetTitle>{inicial.titulo === "Novo gráfico" ? "Novo gráfico" : "Editar gráfico"}</SheetTitle>
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
                          <SelectContent><SelectItem value="mes">Mês</SelectItem><SelectItem value="semana">Semana</SelectItem><SelectItem value="agenda">Lista de agenda</SelectItem></SelectContent>
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
                  <Select value={c.tipo} onValueChange={(v) => set(v === "calendario" ? { tipo: "calendario", serie: null, granularidade: "dia", dimensao: c.dimensao && ehData(c.dimensao) ? c.dimensao : primeiraData() } : { tipo: v as any })}>
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
              <label className="flex items-center gap-2 text-sm"><Switch checked={c.comparar} onCheckedChange={(v) => set({ comparar: v })} /> Comparar com o período anterior</label>
              <div className="space-y-1">
                <Label>Filtro do gráfico</Label>
                <FiltroCampos clienteId={clienteId} filtros={c.filtros} onFiltros={(f) => set({ filtros: f })} fonteDaVisao={c.fonte} />
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

/* ---------------- calendário ---------------- */

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (dia: string, n: number) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const segunda = (dia: string) => somarDias(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7));

function CalendarioCartao({ clienteId, cartao, filtrosVisao, menu, previa }: { clienteId: string; cartao: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; menu?: React.ReactNode; previa?: boolean }) {
  const [visual, setVisual] = useState(cartao.visualCalendario);
  const [ref, setRef] = useState(hojeSP());
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  useEffect(() => setVisual(cartao.visualCalendario), [cartao.visualCalendario]);
  const per: Periodo = useMemo(() => {
    if (visual === "semana") { const de = segunda(ref); return { de, ate: somarDias(de, 6) }; }
    const de = `${ref.slice(0, 7)}-01`;
    const fim = new Date(`${de}T12:00:00Z`); fim.setUTCMonth(fim.getUTCMonth() + 1); fim.setUTCDate(0);
    return { de, ate: iso(fim) };
  }, [visual, ref]);
  const { r, erro } = useResultado(clienteId, { ...cartao, granularidade: "dia" }, per, filtrosVisao, previa);
  if (r?.oculto) return null;
  const res = r?.r;
  const valores = new Map((res?.categorias ?? []).map((c) => [c.rotulo, c.total]));
  const estimados = new Set(res?.estimados ?? []);
  const aguardando = new Set(res?.aguardando ?? []);
  const max = Math.max(1, ...valores.values());
  const navegar = (n: number) => setRef((d) => (visual === "semana" ? somarDias(d, 7 * n) : (() => { const x = new Date(`${d.slice(0, 7)}-01T12:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return iso(x); })()));
  const titulo = visual === "semana" ? `${per.de.split("-").reverse().join("/")} – ${per.ate.split("-").reverse().join("/")}` : new Date(`${per.de}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const inicio = visual === "semana" ? per.de : segunda(per.de);
  const dias: string[] = [];
  for (let d = inicio; d <= per.ate || dias.length % 7 !== 0; d = somarDias(d, 1)) dias.push(d);
  const celula = (dia: string) => {
    const fora = dia < per.de || dia > per.ate;
    const v = valores.get(dia);
    const est = estimados.has(dia);
    const ag = aguardando.has(dia);
    const intens = v ? Math.round((v / max) * 70) + 8 : 0;
    return (
      <button
        key={dia}
        type="button"
        disabled={fora}
        onClick={() => setDiaAberto(dia)}
        className={`flex min-h-14 flex-col items-start rounded-md border p-1.5 text-left text-xs transition-colors ${fora ? "opacity-30" : "hover:border-primary"} ${dia === hojeSP() ? "border-primary" : ""}`}
        style={intens ? { background: `color-mix(in oklch, var(--primary) ${intens}%, var(--card))` } : undefined}
        aria-label={`${dia.split("-").reverse().join("/")}: ${ag ? "aguardando sincronização" : fmt(v ?? 0, cartao)}`}
      >
        <span className="text-muted-foreground">{Number(dia.slice(8))}</span>
        <span className="mt-auto font-semibold tabular-nums">{ag ? <span className="font-normal text-muted-foreground">aguardando</span> : v ? fmt(v, cartao) : ""}</span>
        {est && <MarcaEstimativa desde={res?.primeiraLeitura} />}
      </button>
    );
  };
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{cartao.titulo}</h3>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Anterior" onClick={() => navegar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-28 text-center text-sm capitalize">{titulo}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Próximo" onClick={() => navegar(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-7" onClick={() => setRef(hojeSP())}>Hoje</Button>
          <Select value={visual} onValueChange={(v) => setVisual(v as any)}>
            <SelectTrigger className="h-7 w-auto" aria-label="Visualização"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mes">Mês</SelectItem><SelectItem value="semana">Semana</SelectItem><SelectItem value="agenda">Agenda</SelectItem></SelectContent>
          </Select>
          {menu}
        </div>
      </header>
      {erro && !r ? (
        <p className="text-sm text-muted-foreground">Não foi possível calcular agora.</p>
      ) : !r ? (
        <Skeleton className="h-64 w-full" />
      ) : visual === "agenda" ? (
        <ul className="divide-y text-sm">
          {[...valores.entries()].filter(([, v]) => v).map(([dia, v]) => (
            <li key={dia}><button type="button" className="flex w-full justify-between py-1.5 text-left hover:text-primary" onClick={() => setDiaAberto(dia)}><span>{new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })}{estimados.has(dia) && <MarcaEstimativa desde={res?.primeiraLeitura} />}</span><span className="tabular-nums">{fmt(v, cartao)}</span></button></li>
          ))}
          {![...valores.values()].some(Boolean) && <li className="py-2 text-muted-foreground">Nenhum item neste período.</li>}
        </ul>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {SEMANA.map((d) => <span key={d} className="pb-1 text-center text-[11px] uppercase text-muted-foreground">{d}</span>)}
          {dias.map(celula)}
        </div>
      )}
      {res && <p className="mt-2 text-xs text-muted-foreground">Total no período: {fmt(res.total, cartao)}{estimados.size ? ` · ${estimados.size} dia(s) estimado(s), fora do total` : ""}</p>}
      {diaAberto && <ItensDoDia clienteId={clienteId} cartao={cartao} dia={diaAberto} filtrosVisao={filtrosVisao} onFechar={() => setDiaAberto(null)} />}
    </section>
  );
}

function ItensDoDia({ clienteId, cartao, dia, filtrosVisao, onFechar }: { clienteId: string; cartao: CartaoGrafico; dia: string; filtrosVisao: FiltroCampo[]; onFechar: () => void }) {
  const [itens, setItens] = useState<ItemDia[] | null>(null);
  useEffect(() => {
    let vivo = true;
    itensDiaCalendario({ data: { clienteId, dia, cartao, filtrosVisao } }).then((r) => vivo && setItens(r.itens as ItemDia[])).catch((e) => { toast.error(msg(e)); vivo && setItens([]); });
    return () => { vivo = false; };
  }, [clienteId, dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const extras = itens?.length ? Object.keys(itens[0].campos) : [];
  const temValor = itens?.some((i) => i.valor != null);
  return (
    <Sheet open onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{cartao.titulo} · {dia.split("-").reverse().join("/")}</SheetTitle>
          <SheetDescription>{cartao.medida === "indicador" ? "A lista do dia existe para calendários de campo de data." : itens ? `${itens.length} item(ns)` : "Carregando…"}</SheetDescription>
        </SheetHeader>
        {!itens ? <Skeleton className="mt-4 h-40 w-full" /> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-2">Nome</th><th className="py-1 pr-2">Telefone</th><th className="py-1 pr-2">Atendente</th>{temValor && <th className="py-1 pr-2 text-right">Valor</th>}{extras.map((k) => <th key={k} className="py-1 pr-2">{k.split("|")[1]?.replace(/^campo\./, "")}</th>)}</tr></thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-1.5 pr-2">{i.nome}</td><td className="py-1.5 pr-2 tabular-nums">{i.telefone}</td><td className="py-1.5 pr-2">{i.atendente}</td>
                    {temValor && <td className="py-1.5 pr-2 text-right tabular-nums">{i.valor == null ? "—" : fmt(i.valor, cartao)}</td>}
                    {extras.map((k) => <td key={k} className="py-1.5 pr-2">{i.campos[k]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
