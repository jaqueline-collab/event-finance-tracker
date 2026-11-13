import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, GripVertical, MoreHorizontal, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
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
import { FiltroCampos } from "@/components/filtro-campos";
import type { FiltroCampo, FonteCampo } from "@/lib/campos-elora";
import { FONTES_CATALOGO } from "@/lib/campos-elora";
import { calcularCartao, itensDiaCalendario, moverCartaoVisao, opcoesGraficos, salvarCartoesVisao } from "@/lib/graficos.functions";
import { desfazer, empurrar, encaixar, historico, LARGURA_GRADE_PX, layoutPadrao, LINHA_PX, redimensionar, refazer, reordenar, tamanhoDe, type Historico } from "@/lib/layout-blocos";
import {
  aplicarAlternativa, ehTituloPadrao, fontesDisponiveis, funilTop, percentuaisFunil, MEDIDAS, tituloPadrao, type ItemDia, novoCartao, ROTULO_MEDIDA, ROTULO_TIPO_GRAFICO, tiposDisponiveis, type CartaoGrafico, type CampoRef, type ResultadoCartao,
} from "@/lib/graficos";
import { formatarDuracao, type Periodo } from "@/lib/painel-visual";
import { NAO_DEFINIDO } from "@/lib/nao-definido";
import { ehUrl, formatarMoeda, rotuloCorrido, textoLink } from "@/lib/formatos";
import { filtrarPorTipo, type EventoCalendario, type FiltroTipoCalendario } from "@/lib/graficos";
import { MarcaEstimativa, PontoCobertura } from "@/components/marca-estimativa";

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
  const [alt, setAlt] = useState(-1);
  const base = alt >= 0 ? aplicarAlternativa(cartao, alt) : cartao;
  const efetivo = cartao.painel === "leads-por" ? { ...base, dimensao: dim } : base;
  const { r, erro } = useResultado(clienteId, efetivo, periodo, filtrosVisao, previa);
  if (r?.oculto) return null;
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1 text-sm font-semibold">{cartao.titulo}{r?.r?.cobertura && r.r.cobertura !== "confirmado" && <PontoCobertura />}</h3>
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
      {r?.r && r.r.estimados.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <MarcaEstimativa desde={r.r.primeiraLeitura} />
          {r.r.estimados.length} dia(s) estimado(s), fora do total.
        </p>
      )}
    </section>
  );
}

/** Variação: sucesso, alerta (destrutivo) ou neutro — tokens com contraste AA nos dois temas. */
export const corVariacao = (varia: number | null, bom: boolean) => (varia == null || Math.abs(varia) < 0.05 ? "text-muted-foreground" : bom ? "text-success" : "text-destructive");

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
        {!!r.qtdEstimados && <p className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground"><MarcaEstimativa desde={r.primeiraLeitura} /> {r.qtdEstimados} da quantidade por leitura estimada.</p>}
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
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: any, e: any) => { const t = r.categorias.reduce((a, b) => a + b.total, 0); const x = e?.payload?.total ?? 0; return `${v} · ${(t ? (x / t) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`; }} />
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
                const rot = c.tipo === "matriz_utm" ? "UTMs que agrupam as linhas" : c.tipo === "tabela_itens" ? "Colunas da tabela" : "Outros campos de data (quem vê alterna)";
                return (
                  <div className="space-y-1">
                    <Label>{rot}</Label>
                    <SelCampo valor={null} onMudar={(r) => r && (c.tipo !== "matriz_utm" || r.fonte === "utm") && !lista.some((x) => x.fonte === r.fonte && x.campo === r.campo) && set({ [k]: [...lista, r].slice(0, c.tipo === "tabela_itens" ? 24 : c.tipo === "calendario" ? 4 : 8) } as any)} filtro={c.tipo === "calendario" ? (t) => t === "data" : undefined} nenhum="Adicionar campo…" />
                    <div className="flex flex-wrap gap-1">
                      {lista.map((f) => (
                        <button key={`${f.fonte}|${f.campo}`} type="button" className="rounded-full border px-2 py-0.5 text-xs" onClick={() => set({ [k]: lista.filter((x) => x !== f) } as any)}>
                          {op.catalogo.find((g) => g.fonte === f.fonte)?.campos.find((x) => x.campo === f.campo)?.rotulo ?? f.campo} ×
                        </button>
                      ))}
                    </div>
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

/* ---------------- funil ---------------- */

/** Funil no estilo do Elora App: faixas centradas e decrescentes, texto dentro da faixa (nunca por cima do desenho). */
function FunilCartao({ cartao, r, onClique }: { cartao: CartaoGrafico; r: ResultadoCartao; onClique?: (rotulo: string) => void }) {
  const faixas = funilTop(r.categorias, 8);
  const max = Math.max(1, ...faixas.map((f) => f.total));
  const pcts = percentuaisFunil(faixas, cartao.modoFunil);
  const pct = (i: number) => (pcts[i] == null ? "início" : `${pcts[i]!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  return (
    <>
    <p className="mb-1 text-xs text-muted-foreground">{cartao.modoFunil === "etapas" ? "Conversão de uma etapa para a seguinte" : "% sobre o total"}</p>
    <ol className="flex flex-col items-center gap-1" aria-label={cartao.titulo}>
      {faixas.map((f, i) => (
        <li key={f.rotulo} className="flex w-full flex-col items-center">
          <button
            type="button"
            disabled={!onClique || f.rotulo === "Outras"}
            onClick={() => onClique?.(f.rotulo)}
            title={`${f.rotulo}: ${fmt(f.total, cartao)} (${pct(i)})`}
            className="flex items-center justify-between gap-2 rounded-md border-l-4 px-3 py-1.5 text-xs text-foreground transition-opacity enabled:hover:opacity-90"
            style={{ width: `${Math.max(40, (f.total / max) * 100)}%`, borderColor: f.rotulo === "Outras" ? "var(--muted-foreground)" : CORES[i % 5], background: `color-mix(in oklch, ${f.rotulo === "Outras" ? "var(--muted-foreground)" : CORES[i % 5]} 22%, var(--card))` }}
          >
            <span className="min-w-0 truncate font-medium">{f.rotulo}</span>
            <span className="shrink-0 tabular-nums">{fmt(f.total, cartao)} · {pct(i)}</span>
          </button>
        </li>
      ))}
    </ol>
    </>
  );
}

/* ---------------- calendário ---------------- */

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (dia: string, n: number) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const segunda = (dia: string) => somarDias(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7));

/** Cor de cada tipo de compromisso: 1º campo de data = amarelo da marca (texto marinho), 2º = verde de sucesso. */
export const COR_TIPO_CALENDARIO = ["bg-agenda-consulta text-agenda-consulta-foreground", "bg-agenda-procedimento text-agenda-procedimento-foreground", "bg-accent text-accent-foreground", "bg-muted text-foreground"] as const;
const corTipo = (t: number) => COR_TIPO_CALENDARIO[t] ?? COR_TIPO_CALENDARIO[3];

function CalendarioCartao({ clienteId, cartao, filtrosVisao, menu, previa }: { clienteId: string; cartao: CartaoGrafico; periodo: Periodo; filtrosVisao: FiltroCampo[]; menu?: React.ReactNode; previa?: boolean }) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoCalendario>("todos");
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
  const tipos = res?.tiposCalendario ?? [];
  const comEventos = !!res?.eventos;
  const eventos = filtrarPorTipo(res?.eventos ?? [], filtroTipo);
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e]);
  const valores = new Map((res?.categorias ?? []).map((c) => [c.rotulo, c.total]));
  const estimados = new Set(res?.estimados ?? []);
  const aguardando = new Set(res?.aguardando ?? []);
  const navegar = (n: number) => setRef((d) => (visual === "semana" ? somarDias(d, 7 * n) : (() => { const x = new Date(`${d.slice(0, 7)}-01T12:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); return iso(x); })()));
  const titulo = visual === "semana" ? `${per.de.split("-").reverse().join("/")} – ${per.ate.split("-").reverse().join("/")}` : new Date(`${per.de}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const inicio = visual === "semana" ? per.de : segunda(per.de);
  const dias: string[] = [];
  for (let d = inicio; d <= per.ate || dias.length % 7 !== 0; d = somarDias(d, 1)) dias.push(d);
  const semanas = dias.length / 7;
  const celula = (dia: string) => {
    const fora = dia < per.de || dia > per.ate;
    const evs = porDia.get(dia) ?? [];
    const v = valores.get(dia);
    const est = estimados.has(dia);
    const ag = aguardando.has(dia) && dia <= hojeSP();
    return (
      <button
        key={dia}
        type="button"
        disabled={fora}
        onClick={() => setDiaAberto(dia)}
        className={`flex min-h-16 min-w-0 flex-col items-stretch gap-0.5 overflow-hidden rounded-md border p-1 text-left text-xs transition-colors ${fora ? "opacity-30" : "hover:border-primary"} ${dia === hojeSP() ? "border-primary" : ""}`}
        aria-label={`${dia.split("-").reverse().join("/")}: ${ag ? "sem cobertura de sincronização confirmada" : comEventos ? `${evs.length} compromisso(s)` : v ? fmt(v, cartao) : "sem registro"}`}
      >
        <span className="flex w-full items-center justify-between text-muted-foreground">{Number(dia.slice(8))}{ag && <PontoCobertura texto="Dia sem cobertura de sincronização confirmada." />}</span>
        {comEventos ? (
          <>
            {evs.slice(0, 3).map((e) => (
              <span key={e.id} className={`block truncate rounded px-1 py-0.5 text-[11px] font-medium leading-tight ${corTipo(e.tipo)}`} title={`${e.hora ? `${e.hora} · ` : ""}${e.nome} · ${tipos[e.tipo] ?? ""}`}>{e.nome}</span>
            ))}
            {evs.length > 3 && <span className="text-[11px] font-semibold text-muted-foreground">+{evs.length - 3}</span>}
          </>
        ) : (
          <span className="mt-auto font-semibold tabular-nums">{v ? fmt(v, cartao) : ""}</span>
        )}
        {est && <MarcaEstimativa desde={res?.primeiraLeitura} />}
      </button>
    );
  };
  const diasAgenda = comEventos ? [...porDia.keys()] : [...valores.entries()].filter(([, v]) => v).map(([d]) => d);
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{cartao.titulo}</h3>
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
      {tipos.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs" aria-label="Legenda">
          {tipos.map((t, i) => (filtroTipo === "todos" || filtroTipo === i) && <span key={i} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${corTipo(i)}`} />{t}</span>)}
        </div>
      )}
      {erro && !r ? (
        <p className="text-sm text-muted-foreground">Não foi possível calcular agora.</p>
      ) : !r ? (
        <Skeleton className="h-64 w-full" />
      ) : visual === "agenda" ? (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto text-sm">
          {diasAgenda.map((dia) => (
            <li key={dia}><button type="button" className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:text-primary" onClick={() => setDiaAberto(dia)}>
              <span>{new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })}{estimados.has(dia) && <MarcaEstimativa desde={res?.primeiraLeitura} />}</span>
              {comEventos ? <span className="flex min-w-0 flex-wrap justify-end gap-1">{(porDia.get(dia) ?? []).slice(0, 3).map((e) => <span key={e.id} className={`max-w-40 truncate rounded px-1 text-[11px] ${corTipo(e.tipo)}`}>{e.nome}</span>)}{(porDia.get(dia)?.length ?? 0) > 3 && <span className="text-[11px] text-muted-foreground">+{(porDia.get(dia)?.length ?? 0) - 3}</span>}</span> : <span className="tabular-nums">{fmt(valores.get(dia) ?? 0, cartao)}</span>}
            </button></li>
          ))}
          {!diasAgenda.length && <li className="py-2 text-muted-foreground">Nenhum compromisso neste período.</li>}
        </ul>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1" style={{ gridTemplateRows: `auto repeat(${semanas}, minmax(4rem, 1fr))` }}>
          {SEMANA.map((d) => <span key={d} className="pb-1 text-center text-[11px] uppercase text-muted-foreground">{d}</span>)}
          {dias.map(celula)}
        </div>
      )}
      {res && <p className="mt-2 text-xs text-muted-foreground">{comEventos ? `${eventos.length.toLocaleString("pt-BR")} compromisso(s) no período` : `Total no período: ${fmt(res.total, cartao)}`}{estimados.size ? ` · ${estimados.size} dia(s) estimado(s), fora do total` : ""}</p>}
      {diaAberto && <ItensDoDia clienteId={clienteId} cartao={cartao} dia={diaAberto} filtrosVisao={filtrosVisao} filtroTipo={filtroTipo} tipos={tipos} onFechar={() => setDiaAberto(null)} />}
    </section>
  );
}

function ItensDoDia({ clienteId, cartao, dia, filtrosVisao, filtroTipo, tipos, onFechar }: { clienteId: string; cartao: CartaoGrafico; dia: string; filtrosVisao: FiltroCampo[]; filtroTipo: FiltroTipoCalendario; tipos: string[]; onFechar: () => void }) {
  const [todos, setTodos] = useState<ItemDia[] | null>(null);
  useEffect(() => {
    let vivo = true;
    itensDiaCalendario({ data: { clienteId, dia, cartao, filtrosVisao } }).then((r) => vivo && setTodos(r.itens as ItemDia[])).catch((e) => { toast.error(msg(e)); vivo && setTodos([]); });
    return () => { vivo = false; };
  }, [clienteId, dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const itens = todos ? filtrarPorTipo(todos, filtroTipo) : null;
  const rotulos = Object.fromEntries(cartao.camposLista.map((f) => [`${f.fonte}|${f.campo}`, f.rotulo || rotuloCorrido(f.campo)]));
  const extras = Object.keys(rotulos).filter((k) => itens?.some((i) => k in i.campos));
  const temValor = itens?.some((i) => i.valor != null);
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
          <div className="mt-4">
            <table className="w-full table-auto text-sm [&_td]:align-top [&_td]:break-words">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-2">Data e hora</th><th className="py-1 pr-2">Nome</th><th className="py-1 pr-2">Tipo</th><th className="py-1 pr-2">Telefone</th>{extras.map((k) => <th key={k} className="py-1 pr-2">{rotulos[k]}</th>)}{temValor && <th className="py-1 pr-2 text-right">Valor</th>}</tr></thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-1.5 pr-2 tabular-nums">{i.data || "—"}</td>
                    <td className="py-1.5 pr-2">{i.nome}</td>
                    <td className="py-1.5 pr-2"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${corTipo(i.tipo)}`}>{tipos[i.tipo] ?? "—"}</span></td>
                    <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{i.telefone}</td>
                    {extras.map((k) => <td key={k} className="py-1.5 pr-2">{i.campos[k]}</td>)}
                    {temValor && <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums">{i.valor == null ? "—" : formatarMoeda(i.valor)}</td>}
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

/* ---------------- tabela de itens ---------------- */

/** URL vira link (nova aba, texto curto, endereço completo no tooltip); o resto é texto. */
function celulaTexto(v: string) {
  if (!ehUrl(v)) return v;
  return <a href={v.trim()} target="_blank" rel="noopener noreferrer" title={v.trim()} className="text-primary underline underline-offset-2 hover:text-primary/80">{textoLink(v.trim())}</a>;
}

/** Uma linha por contato/card: ordenar, agrupar, ocultar colunas, paginar e exportar (CSV, só o que está visível). */
function TabelaItens({ cartao, r }: { cartao: CartaoGrafico; r: ResultadoCartao }) {
  const cols = r.colunasItens ?? [];
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean } | null>(null);
  const [agrupar, setAgrupar] = useState<string>("");
  const [pagina, setPagina] = useState(0);
  const vis = cols.filter((c) => !ocultas.includes(c.chave));
  const linhas = useMemo(() => {
    const l = [...(r.itens ?? [])];
    if (ordem) l.sort((a, b) => { const va = a.brutos?.[ordem.col] ?? a.valores[ordem.col] ?? ""; const vb = b.brutos?.[ordem.col] ?? b.valores[ordem.col] ?? ""; const na = Number(va), nb = Number(vb); const s = va !== "" && vb !== "" && Number.isFinite(na) && Number.isFinite(nb) ? na - nb : va.localeCompare(vb, "pt-BR", { numeric: true }); return ordem.desc ? -s : s; });
    if (agrupar) l.sort((a, b) => (a.valores[agrupar] ?? "").localeCompare(b.valores[agrupar] ?? "", "pt-BR"));
    return l;
  }, [r, ordem, agrupar]);
  const POR = 25;
  const paginas = Math.max(1, Math.ceil(linhas.length / POR));
  const pag = linhas.slice(pagina * POR, pagina * POR + POR);
  const exportar = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [vis.map((c) => esc(c.rotulo)).join(";"), ...linhas.map((l) => vis.map((c) => esc(l.valores[c.chave] ?? "")).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${cartao.titulo}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  if (!linhas.length) return <p className="text-sm text-muted-foreground">Nenhum item no período.</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {cols.map((c) => (
          <button key={c.chave} type="button" onClick={() => setOcultas((o) => (o.includes(c.chave) ? o.filter((x) => x !== c.chave) : [...o, c.chave]))} className={`rounded-full border px-2 py-0.5 text-xs ${ocultas.includes(c.chave) ? "text-muted-foreground line-through" : ""}`}>{c.rotulo}</button>
        ))}
        <Select value={agrupar || "_"} onValueChange={(v) => setAgrupar(v === "_" ? "" : v)}>
          <SelectTrigger className="h-7 w-auto text-xs" aria-label="Agrupar por"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="_">Sem agrupar</SelectItem>{vis.map((c) => <SelectItem key={c.chave} value={c.chave}>Agrupar: {c.rotulo}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportar}>Exportar</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr>{vis.map((c) => (
            <th key={c.chave} className="whitespace-nowrap border-b px-2 py-1.5 text-left font-medium">
              <button type="button" className="inline-flex items-center gap-1" onClick={() => setOrdem((o) => ({ col: c.chave, desc: o?.col === c.chave ? !o.desc : false }))}>{c.rotulo} {ordem?.col === c.chave && (ordem.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}</button>
            </th>
          ))}</tr></thead>
          <tbody>
            {pag.map((l, i) => {
              const novoGrupo = agrupar && (i === 0 ? true : pag[i - 1].valores[agrupar] !== l.valores[agrupar]);
              return [
                novoGrupo ? <tr key={`g${l.id}`}><td colSpan={vis.length} className="bg-muted px-2 py-1 font-semibold">{l.valores[agrupar]}</td></tr> : null,
                <tr key={l.id} className="border-b last:border-0">{vis.map((c) => <td key={c.chave} className="max-w-56 truncate px-2 py-1.5">{celulaTexto(l.valores[c.chave] ?? "")}</td>)}</tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{linhas.length.toLocaleString("pt-BR")} itens</span>
        {paginas > 1 && (
          <span className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            {pagina + 1}/{paginas}
            <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Próxima página" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </span>
        )}
      </div>
    </div>
  );
}
