import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock, Eye, EyeOff, MoreHorizontal, Megaphone, MessagesSquare, Minus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPainelVisual } from "@/lib/painel-visual.functions";
import { FiltroCampos } from "@/components/filtro-campos";
import { separarFiltros, type FiltroCampo, type FonteCampo } from "@/lib/campos-elora";
import {
  DIMENSOES,
  ROTULO_PERIODO,
  formatarDuracao,
  periodoDe,
  variacao,
  type Dimensao,
  type Periodo,
  type PeriodoChave,
} from "@/lib/painel-visual";

/** Dimensões que o painel aplica direto; o resto do catálogo liga pelo contato. */
export const NATIVOS_PAINEL: Record<Dimensao, { fonte: FonteCampo; campo: string }> = {
  canal: { fonte: "atendimento", campo: "canal" },
  atendente: { fonte: "atendimento", campo: "atendente" },
  origem: { fonte: "contato", campo: "origem" },
  etiqueta: { fonte: "contato", campo: "etiquetas" },
  campanha: { fonte: "utm", campo: "campaign" },
};

type Dados = Extract<Awaited<ReturnType<typeof getPainelVisual>>, { disponivel: true }>;

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
  filtros: FiltroCampo[];
  onFiltros: (f: FiltroCampo[]) => void;
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
    const { diretos, outros } = separarFiltros(filtros, NATIVOS_PAINEL);
    getPainelVisual({ data: { clienteId, de: periodo.de, ate: periodo.ate, filtros: diretos, campos: outros } })
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FiltroCampos
          clienteId={clienteId}
          filtros={filtros}
          onFiltros={onFiltros}
          fonteDaVisao="varias"
          opcoesNativas={Object.fromEntries(DIMENSOES.map((d) => [`${NATIVOS_PAINEL[d.chave].fonte}|${NATIVOS_PAINEL[d.chave].campo}`, dados?.opcoes[d.chave] ?? []]))}
        />
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
          {dados.cobertura !== "confirmado" && <p className="text-xs text-muted-foreground">{dados.cobertura} · cobertura diária não confirmada</p>}

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
      <CartaoIndicador icone={<UserPlus className="h-4 w-4" />} cor="var(--chart-1)" rotulo="Novos leads" valor={dados.cobertura !== "confirmado" && a.novosLeads === 0 ? "—" : nf.format(Math.round(leads))} selo={<Selo v={variacao(a.novosLeads, p.novosLeads)} />} rodape={a.importadosFora ? `${nf.format(a.importadosFora)} importados fora da conta` : undefined} />
      <CartaoIndicador icone={<MessagesSquare className="h-4 w-4" />} cor="var(--chart-2)" rotulo="Conversas realizadas" valor={dados.cobertura !== "confirmado" && a.conversas === 0 ? "—" : nf.format(Math.round(conv))} selo={<Selo v={variacao(a.conversas, p.conversas)} />} />
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
        valor={dados.cobertura !== "confirmado" && a.leadsAds === 0 ? "—" : nf.format(Math.round(ads))}
        selo={<Selo v={variacao(a.leadsAds, p.leadsAds)} />}
        rodape={`${pctAds.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos novos leads`}
      />
    </div>
  );
}

