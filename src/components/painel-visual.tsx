import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock, Megaphone, MessagesSquare, Minus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPainelVisual } from "@/lib/painel-visual.functions";
import {
  DIMENSOES,
  ROTULO_PERIODO,
  formatarDuracao,
  periodoDe,
  variacao,
  type Dimensao,
  type Filtros,
  type Periodo,
  type PeriodoChave,
} from "@/lib/painel-visual";

type Dados = Extract<Awaited<ReturnType<typeof getPainelVisual>>, { disponivel: true }>;

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const nf = new Intl.NumberFormat("pt-BR");
const pct = (v: number, t: number) => (t ? `${((v / t) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : "0%");
const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;

function useMovimentoReduzido() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

function useContagem(alvo: number, reduzido: boolean) {
  const [v, setV] = useState(reduzido ? alvo : 0);
  const de = useRef(0);
  useEffect(() => {
    if (reduzido) return setV(alvo);
    const ini = de.current;
    const t0 = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setV(ini + (alvo - ini) * e);
      if (k < 1) raf = requestAnimationFrame(passo);
      else de.current = alvo;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, reduzido]);
  return v;
}

/* ---------------- Cabeçalho e período ---------------- */

export function SeletorPeriodo({
  chave,
  periodo,
  onMudar,
}: {
  chave: PeriodoChave;
  periodo: Periodo;
  onMudar: (c: PeriodoChave, p: Periodo) => void;
}) {
  const [de, setDe] = useState(periodo.de);
  const [ate, setAte] = useState(periodo.ate);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    setDe(periodo.de);
    setAte(periodo.ate);
  }, [periodo.de, periodo.ate]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={chave === "personalizado" ? "__atual" : chave}
        onValueChange={(v) => {
          const c = v as PeriodoChave;
          if (c === "personalizado") return setAberto(true);
          onMudar(c, periodoDe(c, new Date().toISOString()));
        }}
      >
        <SelectTrigger className="h-10 w-auto gap-2 bg-card" aria-label="Período">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            <span className="hidden sm:inline">{ROTULO_PERIODO[chave]} · </span>
            {dataBr(periodo.de)} a {dataBr(periodo.ate)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {(Object.keys(ROTULO_PERIODO) as PeriodoChave[]).map((k) => (
            <SelectItem key={k} value={k}>
              {ROTULO_PERIODO[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <p className="text-sm font-medium">Período personalizado</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              De
              <Input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Até
              <Input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
            </label>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!de || !ate || de > ate}
            onClick={() => {
              onMudar("personalizado", { de, ate });
              setAberto(false);
            }}
          >
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------------- Painel ---------------- */

export function PainelVisual({
  clienteId,
  periodo,
  filtros,
  onFiltros,
  editando,
  ocultos = [],
  onAlternarOculto,
  onDisponivel,
}: {
  clienteId: string;
  periodo: Periodo;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  editando?: boolean;
  /** Cartões ocultos do cliente nesta visão (só some fora do modo Editar). */
  ocultos?: string[];
  onAlternarOculto?: (id: string) => void;
  onDisponivel?: (sim: boolean) => void;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const reduzido = useMovimentoReduzido();
  const chaveFiltros = JSON.stringify(filtros);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    getPainelVisual({ data: { clienteId, de: periodo.de, ate: periodo.ate, filtros } })
      .then((r) => {
        if (!vivo) return;
        if (!r.disponivel) setIndisponivel(true);
        else setDados(r as Dados);
        onDisponivel?.(r.disponivel);
      })
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, periodo.de, periodo.ate, chaveFiltros]);

  if (indisponivel) return null;
  const aplicar = (dim: Dimensao, valor: string | undefined) => onFiltros({ ...filtros, [dim]: valor || undefined });
  const temFiltro = Object.values(filtros).some(Boolean);
  const extra = (id: string) => {
    const oculto = ocultos.includes(id);
    return {
      escondido: oculto && !editando,
      oculto: oculto && editando,
      menu:
        editando && onAlternarOculto ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Opções do cartão">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAlternarOculto(id)}>
                {oculto ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {oculto ? "Mostrar ao cliente" : "Ocultar do cliente"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {DIMENSOES.map((d) => (
          <ChipFiltro
            key={d.chave}
            rotulo={d.rotulo}
            todos={d.todos}
            valor={filtros[d.chave]}
            opcoes={dados?.opcoes[d.chave] ?? []}
            onValor={(v) => aplicar(d.chave, v)}
          />
        ))}
        {temFiltro && (
          <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={() => onFiltros({})}>
            Limpar filtros
          </Button>
        )}
        {dados?.ultimaSync && (
          <span className="ml-auto text-sm text-muted-foreground" title={new Date(dados.ultimaSync).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}>
            atualizado {haQuanto(dados.ultimaSync)}
          </span>
        )}
      </div>

      {erro && !dados && (
        <p className="rounded-xl border bg-card p-6 text-sm text-destructive">Não foi possível carregar o painel: {erro}</p>
      )}

      {!dados && !erro ? (
        <EsqueletoPainel />
      ) : dados ? (
        <div className={`space-y-5 transition-opacity duration-300 ${carregando ? "opacity-60" : "opacity-100"}`} aria-busy={carregando}>
          <Indicadores dados={dados} reduzido={reduzido} />
          <div className="grid gap-5 lg:grid-cols-3">
            <Cartao titulo="Leads por dia" className="lg:col-span-2" {...extra("leads-dia")}>
              <BarrasPorDia
                dados={dados.porDia}
                series={[
                  { chave: "organicos", rotulo: "Sem campanha", cor: CORES[0] },
                  { chave: "ads", rotulo: "Vindos de ADS", cor: CORES[2] },
                ]}
                vazio="Nenhum lead neste período"
                reduzido={reduzido}
              />
            </Cartao>
            <Cartao titulo="Leads por" seletor className="" {...extra("leads-por")}>
              <RoscaLeads dados={dados} reduzido={reduzido} onFiltrar={aplicar} />
            </Cartao>
            <Cartao titulo="Conversas por dia" className="lg:col-span-2" {...extra("conversas-dia")}>
              <BarrasPorDia
                dados={dados.porDia}
                series={[
                  { chave: "usuario", rotulo: "Usuário do sistema", cor: CORES[1] },
                  { chave: "bot", rotulo: "Bot", cor: CORES[3] },
                ]}
                vazio="Nenhuma conversa neste período"
                reduzido={reduzido}
              />
            </Cartao>
            <Cartao titulo="Principais campanhas" subtitulo="Leads com campanha (top 8)" {...extra("campanhas")}>
              <Ranking itens={dados.campanhas} vazio="Nenhum lead de campanha neste período" onFiltrar={(v) => aplicar("campanha", v)} reduzido={reduzido} />
            </Cartao>
            <Cartao titulo="Atendimentos por canal" {...extra("canais")}>
              <Ranking itens={dados.canais} vazio="Nenhum atendimento neste período" onFiltrar={(v) => aplicar("canal", v)} reduzido={reduzido} />
            </Cartao>
            <Cartao titulo="Conversas por atendente" className="lg:col-span-2" {...extra("atendentes")}>
              <TabelaAtendentes itens={dados.atendentes} onFiltrar={(v) => aplicar("atendente", v)} reduzido={reduzido} />
            </Cartao>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function haQuanto(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function EsqueletoPainel() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

/* ---------------- Chips ---------------- */

function ChipFiltro({
  rotulo,
  todos,
  valor,
  opcoes,
  onValor,
}: {
  rotulo: string;
  todos: string;
  valor?: string;
  opcoes: string[];
  onValor: (v?: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ativo = Boolean(valor);
  return (
    <div className={`inline-flex h-8 items-center rounded-full text-sm transition-colors ${ativo ? "bg-brand-soft text-foreground ring-1 ring-brand" : "bg-muted text-foreground"}`}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-full items-center gap-1 rounded-full pl-3.5 pr-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={ativo ? "font-medium" : ""}>
              {rotulo}: {valor ?? todos}
            </span>
            {!ativo && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            {opcoes.length > 8 && <CommandInput placeholder={`Buscar ${rotulo.toLowerCase()}…`} />}
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={() => { onValor(undefined); setAberto(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${!valor ? "opacity-100" : "opacity-0"}`} /> {rotulo}: {todos}
                </CommandItem>
                {opcoes.map((o) => (
                  <CommandItem key={o} value={o} onSelect={() => { onValor(o); setAberto(false); }}>
                    <Check className={`mr-2 h-4 w-4 ${valor === o ? "opacity-100" : "opacity-0"}`} /> {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {ativo && (
        <button type="button" onClick={() => onValor(undefined)} className="mr-1.5 rounded-full p-0.5 hover:bg-background/60" aria-label={`Remover filtro ${rotulo}`}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Indicadores ---------------- */

function Selo({ v, menorMelhor, sufixo = "%" }: { v: number | null; menorMelhor?: boolean; sufixo?: string }) {
  if (v == null || !Number.isFinite(v))
    return <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> sem base</span>;
  const neutro = Math.abs(v) < 0.05;
  const bom = menorMelhor ? v < 0 : v > 0;
  const cls = neutro ? "bg-muted text-muted-foreground" : bom ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  const Icone = neutro ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  const txt = `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${sufixo}`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`} title="Contra o período anterior de mesmo tamanho">
      <Icone className="h-3 w-3" aria-hidden /> {txt}
    </span>
  );
}

function CartaoIndicador({ icone, cor, rotulo, valor, selo, rodape }: { icone: ReactNode; cor: string; rotulo: string; valor: ReactNode; selo: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `color-mix(in oklab, ${cor} 16%, transparent)`, color: cor }}>
          {icone}
        </span>
        {rotulo}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{valor}</span>
        {selo}
      </div>
      {rodape && <p className="mt-1.5 text-xs text-muted-foreground">{rodape}</p>}
    </div>
  );
}

function Indicadores({ dados, reduzido }: { dados: Dados; reduzido: boolean }) {
  const { atual: a, anterior: p } = dados.kpis;
  const leads = useContagem(a.novosLeads, reduzido);
  const conv = useContagem(a.conversas, reduzido);
  const ads = useContagem(a.leadsAds, reduzido);
  const pctAds = a.novosLeads ? (a.leadsAds / a.novosLeads) * 100 : 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <CartaoIndicador icone={<UserPlus className="h-4 w-4" />} cor="var(--chart-1)" rotulo="Novos leads" valor={nf.format(Math.round(leads))} selo={<Selo v={variacao(a.novosLeads, p.novosLeads)} />} rodape={a.importadosFora ? `${nf.format(a.importadosFora)} importados fora da conta` : undefined} />
      <CartaoIndicador icone={<MessagesSquare className="h-4 w-4" />} cor="var(--chart-2)" rotulo="Conversas realizadas" valor={nf.format(Math.round(conv))} selo={<Selo v={variacao(a.conversas, p.conversas)} />} />
      <CartaoIndicador
        icone={<Clock className="h-4 w-4" />}
        cor="var(--chart-4)"
        rotulo="TMR · TMA"
        valor={<span className="text-2xl">{formatarDuracao(a.tmr.valor)} · {formatarDuracao(a.tma.valor)}</span>}
        selo={<Selo v={a.tmr.valor != null && p.tmr.valor ? variacao(a.tmr.valor, p.tmr.valor) : null} menorMelhor />}
        rodape={`${nf.format(a.tmr.medidas)} conversas medidas (TMR) · ${nf.format(a.tma.medidas)} (TMA)`}
      />
      <CartaoIndicador
        icone={<Megaphone className="h-4 w-4" />}
        cor="var(--chart-3)"
        rotulo="Leads de ADS"
        valor={nf.format(Math.round(ads))}
        selo={<Selo v={variacao(a.leadsAds, p.leadsAds)} />}
        rodape={`${pctAds.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos novos leads`}
      />
    </div>
  );
}

/* ---------------- Cartões e gráficos ---------------- */

function Cartao({
  titulo,
  subtitulo,
  children,
  className = "",
  menu,
  seletor,
  escondido,
  oculto,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  className?: string;
  menu?: ReactNode;
  seletor?: boolean;
  escondido?: boolean;
  oculto?: boolean;
}) {
  if (escondido) return null;
  return (
    <section className={`relative min-w-0 rounded-xl border bg-card p-5 shadow-sm ${oculto ? "border-dashed opacity-60" : ""} ${className}`} aria-label={seletor ? undefined : titulo}>
      {oculto && <span className="absolute left-5 top-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Oculto do cliente</span>}
      {seletor && menu && <div className="absolute right-3 top-3 z-10">{menu}</div>}
      {!seletor && (
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">{titulo}</h3>
            {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
          </div>
          {menu}
        </header>
      )}
      {children}
    </section>
  );
}

const Vazio = ({ texto }: { texto: string }) => (
  <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{texto}</div>
);

function DicaGrafico({ active, payload, label, total }: any) {
  if (!active || !payload?.length) return null;
  const soma = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
          {p.name}: <span className="font-semibold tabular-nums">{nf.format(p.value)}</span>
          <span className="text-muted-foreground">({pct(p.value, total ?? soma)})</span>
        </p>
      ))}
    </div>
  );
}

function Legenda({ series, ocultas, onAlternar }: { series: { chave: string; rotulo: string; cor: string }[]; ocultas: Set<string>; onAlternar: (k: string) => void }) {
  return (
    <div className="mb-3 flex flex-wrap justify-end gap-3 text-sm">
      {series.map((s) => (
        <button
          key={s.chave}
          type="button"
          aria-pressed={!ocultas.has(s.chave)}
          onClick={() => onAlternar(s.chave)}
          className={`flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ocultas.has(s.chave) ? "text-muted-foreground line-through opacity-60" : ""}`}
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} /> {s.rotulo}
        </button>
      ))}
    </div>
  );
}

function BarrasPorDia({
  dados,
  series,
  vazio,
  reduzido,
}: {
  dados: Dados["porDia"];
  series: { chave: string; rotulo: string; cor: string }[];
  vazio: string;
  reduzido: boolean;
}) {
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const total = dados.reduce((s, d) => s + series.reduce((x, k) => x + Number((d as any)[k.chave] ?? 0), 0), 0);
  const linhas = useMemo(() => dados.map((d) => ({ ...d, rotulo: dataCurta(d.dia) })), [dados]);
  const alternar = (k: string) =>
    setOcultas((o) => {
      const n = new Set(o);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  if (!total) return <Vazio texto={vazio} />;
  const visiveis = series.filter((s) => !ocultas.has(s.chave));
  const descricao = `${series.map((s) => `${s.rotulo}: ${nf.format(dados.reduce((x, d) => x + Number((d as any)[s.chave] ?? 0), 0))}`).join("; ")} no período.`;
  return (
    <div>
      <Legenda series={series} ocultas={ocultas} onAlternar={alternar} />
      <div className="h-64" role="img" aria-label={descricao}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={linhas} margin={{ left: -16, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<DicaGrafico />} />
            {visiveis.map((s, i) => (
              <Bar
                key={s.chave}
                dataKey={s.chave}
                name={s.rotulo}
                stackId="a"
                fill={s.cor}
                radius={i === visiveis.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                isAnimationActive={!reduzido}
                animationDuration={600}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const SEM_FILTRO = new Set(["Sem atendimento", "Sem etiqueta", "Sem campanha"]);
const DIM_ROSCA: { chave: "origem" | "canal" | "etiqueta" | "campanha"; rotulo: string }[] = [
  { chave: "origem", rotulo: "Origem" },
  { chave: "canal", rotulo: "Canal" },
  { chave: "etiqueta", rotulo: "Etiqueta" },
  { chave: "campanha", rotulo: "Campanha" },
];

function RoscaLeads({ dados, reduzido, onFiltrar }: { dados: Dados; reduzido: boolean; onFiltrar: (d: Dimensao, v: string) => void }) {
  const [dim, setDim] = useState<(typeof DIM_ROSCA)[number]["chave"]>("origem");
  const todos = dados.leadsPor[dim];
  const fatias = todos.length > 5 ? [...todos.slice(0, 4), { nome: "Outros", valor: todos.slice(4).reduce((s, x) => s + x.valor, 0) }] : todos;
  const total = dim === "etiqueta" ? dados.kpis.atual.novosLeads : todos.reduce((s, x) => s + x.valor, 0);
  const somaFatias = fatias.reduce((s, x) => s + x.valor, 0);
  const clicavel = (n: string) => n !== "Outros" && !SEM_FILTRO.has(n);
  return (
    <div>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Leads por</h3>
        <Select value={dim} onValueChange={(v) => setDim(v as typeof dim)}>
          <SelectTrigger className="h-8 w-auto gap-1 border-none bg-muted px-3 text-sm" aria-label="Dimensão da rosca">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {DIM_ROSCA.map((d) => (
              <SelectItem key={d.chave} value={d.chave}>{d.rotulo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>
      {!somaFatias ? (
        <Vazio texto="Nenhum lead neste período" />
      ) : (
        <>
          <div className="relative mx-auto h-48 w-48" role="img" aria-label={`Leads por ${dim}: ${fatias.map((f) => `${f.nome} ${f.valor}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<DicaGrafico total={somaFatias} />} />
                <Pie
                  data={fatias}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={1}
                  stroke="var(--card)"
                  isAnimationActive={!reduzido}
                  animationDuration={700}
                  onClick={(p: any) => clicavel(p?.nome) && onFiltrar(dim, p.nome)}
                >
                  {fatias.map((f, i) => (
                    <Cell key={f.nome} fill={CORES[i % CORES.length]} className={clicavel(f.nome) ? "cursor-pointer" : ""} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{nf.format(total)}</span>
              <span className="text-xs text-muted-foreground">leads</span>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {fatias.map((f, i) => (
              <li key={f.nome}>
                <button
                  type="button"
                  disabled={!clicavel(f.nome)}
                  onClick={() => onFiltrar(dim, f.nome)}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left enabled:hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CORES[i % CORES.length] }} />
                  <span className="min-w-0 flex-1 truncate">{f.nome}</span>
                  <span className="tabular-nums text-muted-foreground">{nf.format(f.valor)}</span>
                  <span className="w-14 text-right font-medium tabular-nums">{pct(f.valor, somaFatias)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Ranking({ itens, vazio, onFiltrar, reduzido }: { itens: { nome: string; valor: number }[]; vazio: string; onFiltrar: (v: string) => void; reduzido: boolean }) {
  const [montado, setMontado] = useState(reduzido);
  useEffect(() => {
    if (reduzido) return setMontado(true);
    const t = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(t);
  }, [reduzido]);
  if (!itens.length) return <Vazio texto={vazio} />;
  const max = itens[0].valor || 1;
  const total = itens.reduce((s, x) => s + x.valor, 0);
  return (
    <ul className="space-y-3">
      {itens.map((it, i) => (
        <li key={it.nome}>
          <button
            type="button"
            onClick={() => onFiltrar(it.nome)}
            title={`${it.nome}: ${nf.format(it.valor)} (${pct(it.valor, total)})`}
            className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{it.nome}</span>
              <span className="font-semibold tabular-nums">{nf.format(it.valor)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: montado ? `${(it.valor / max) * 100}%` : "0%", background: CORES[i % CORES.length] }}
              />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

function TabelaAtendentes({ itens, onFiltrar, reduzido }: { itens: Dados["atendentes"]; onFiltrar: (v: string) => void; reduzido: boolean }) {
  if (!itens.length) return <Vazio texto="Nenhum atendimento neste período" />;
  const max = Math.max(1, ...itens.map((i) => i.conversas));
  const total = itens.reduce((s, x) => s + x.conversas, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-normal">Atendente</th>
            <th className="pb-2 text-right font-normal">Atendimentos</th>
            <th className="pb-2 text-right font-normal">Conversas</th>
            <th className="w-[34%] pb-2 pl-4 font-normal">Proporção</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((a) => (
            <tr key={a.nome} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => onFiltrar(a.nome)}>
              <td className="py-2.5">
                <button type="button" className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(e) => { e.stopPropagation(); onFiltrar(a.nome); }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{iniciais(a.nome)}</span>
                  {a.nome}
                </button>
              </td>
              <td className="text-right tabular-nums">{nf.format(a.atendimentos)}</td>
              <td className="text-right tabular-nums">{nf.format(a.conversas)}</td>
              <td className="pl-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full bg-chart-1 ${reduzido ? "" : "transition-[width] duration-700"}`} style={{ width: `${(a.conversas / max) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{pct(a.conversas, total)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
