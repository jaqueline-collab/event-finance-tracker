import { alinhamento } from "@/lib/colunas-tabela";
import { BarraTabela } from "@/components/barra-tabela";
import { TabelaItens } from "@/components/cartoes-graficos";
import type { ResultadoCartao } from "@/lib/graficos";
import { formatarCelula, formatarTelefone } from "@/lib/formatos";
import { NAO_DEFINIDO, rotuloDimensao as rotuloND } from "@/lib/nao-definido";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, GripVertical, Info, Loader2, Lock, Megaphone, Pencil, Snowflake, UserRound, Users, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  getRelatorioDiarioCliente,
  getResultadosCliente,
  type RelatorioDiarioLinha,
  type WidgetRenderizado,
} from "@/lib/integracao-elora.functions";
import { DashboardGrid } from "@/components/dashboard-grid";
import { normalizarGrade } from "@/lib/grid-layout";
import { formatBRL } from "@/lib/calc/format";

type Resultados = Awaited<ReturnType<typeof getResultadosCliente>>;

const POR_PAGINA = 20;
const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const hojeIso = () => new Date().toISOString().slice(0, 10);
const diasAtrasIso = (n: number) =>
  new Date(Date.now() - (n - 1) * 86_400_000).toISOString().slice(0, 10);

const dataHoraBr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Segundos → "1h 25min", "47min" ou "40s". */
const duracaoBr = (segundos: number) => {
  if (segundos >= 3600) return `${Math.floor(segundos / 3600)}h ${Math.round((segundos % 3600) / 60)}min`;
  if (segundos >= 60) return `${Math.round(segundos / 60)}min`;
  return `${segundos}s`;
};

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (anoMes: string) => MESES_PT[Number(anoMes.slice(5, 7)) - 1] ?? anoMes;

function Bloco({ children, titulo }: { children: React.ReactNode; titulo: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-sm font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

function WidgetMetrico({ w }: { w: WidgetRenderizado }) {
  const d = w.dados ?? {};
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{w.titulo}</p>
      {!d.configurado ? (
        <p className="mt-1 text-sm text-muted-foreground">Não configurado</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold">
            {d.formato === "duracao"
              ? duracaoBr(Number(d.valor ?? 0))
              : d.formato === "moeda"
                ? formatBRL(Number(d.valor ?? 0))
                : Number(d.valor ?? 0)}
          </p>
          {d.secundario && (
            <p className="text-xs text-muted-foreground">
              {d.secundario.quantidade} {d.secundario.rotulo}
              {d.formato === "numero" && Number(d.valor) > 0
                ? ` (${Math.round((d.secundario.quantidade / Number(d.valor)) * 100)}%)`
                : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function WidgetPizza({ w }: { w: WidgetRenderizado }) {
  const fatias: { nome: string; valor: number }[] = w.dados?.fatias ?? [];
  return (
    <Bloco titulo={w.titulo}>
      {fatias.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sem dados neste período.</p>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={fatias} dataKey="valor" nameKey="nome" outerRadius="75%">
                {fatias.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend formatter={(v: unknown) => <span style={{ color: "var(--foreground)" }}>{String(v)}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Bloco>
  );
}

function WidgetBarras({ w }: { w: WidgetRenderizado }) {
  const meses: string[] = w.dados?.meses ?? [];
  const series: { nome: string; valores: number[] }[] = w.dados?.series ?? [];
  const empilhado = w.dados?.modo === "empilhado";
  const dados = meses.map((m, i) => {
    const linha: Record<string, string | number> = { mes: rotuloMes(m) };
    series.forEach((s, si) => {
      linha[`s${si}`] = s.valores[i] ?? 0;
    });
    return linha;
  });
  return (
    <Bloco titulo={w.titulo}>
      {series.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Não configurado</p>
      ) : (
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(valor, nome) => [
                  Number(valor ?? 0),
                  series[Number(String(nome).slice(1))]?.nome ?? nome,
                ]}
              />
              {series.map((s, si) => (
                <Bar
                  key={si}
                  dataKey={`s${si}`}
                  name={s.nome}
                  stackId={empilhado ? "a" : undefined}
                  fill={CORES[si % CORES.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Últimos 12 meses</p>
    </Bloco>
  );
}

function WidgetCalendario({ w }: { w: WidgetRenderizado }) {
  const camadas: { chave: string; rotulo: string; cor: string }[] = w.dados?.camadas ?? [];
  const eventos: { data: string; camada: string; titulo: string }[] = w.dados?.eventos ?? [];
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [ocultas, setOcultas] = useState<string[]>([]);

  const dias = useMemo(() => {
    const ano = Number(mes.slice(0, 4));
    const m = Number(mes.slice(5, 7)) - 1;
    const primeiro = new Date(Date.UTC(ano, m, 1));
    const total = new Date(Date.UTC(ano, m + 1, 0)).getUTCDate();
    const vazios = primeiro.getUTCDay();
    const lista: ({ dia: number; iso: string } | null)[] = Array(vazios).fill(null);
    for (let d = 1; d <= total; d++) {
      lista.push({ dia: d, iso: `${mes}-${String(d).padStart(2, "0")}` });
    }
    return lista;
  }, [mes]);

  const visiveis = eventos.filter((e) => !ocultas.includes(e.camada));
  const trocarMes = (delta: number) => {
    const ano = Number(mes.slice(0, 4));
    const m = Number(mes.slice(5, 7)) - 1 + delta;
    setMes(new Date(Date.UTC(ano, m, 1)).toISOString().slice(0, 7));
  };

  return (
    <Bloco titulo={w.titulo}>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="icon" variant="outline" aria-label="Mês anterior" onClick={() => trocarMes(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {rotuloMes(mes)}/{mes.slice(0, 4)}
        </span>
        <Button size="icon" variant="outline" aria-label="Próximo mês" onClick={() => trocarMes(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {camadas.map((c) => (
            <button
              key={c.rotulo}
              type="button"
              onClick={() =>
                setOcultas((o) =>
                  o.includes(c.rotulo) ? o.filter((x) => x !== c.rotulo) : [...o, c.rotulo],
                )
              }
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-xs"
              style={{ opacity: ocultas.includes(c.rotulo) ? 0.4 : 1 }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />
              {c.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
        {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map((d, i) => {
          const doDia = d ? visiveis.filter((e) => e.data === d.iso) : [];
          return (
            <div
              key={i}
              className="min-h-16 rounded-md border border-border/50 p-1 text-left text-[11px]"
            >
              {d && <span className="text-muted-foreground">{d.dia}</span>}
              <div className="mt-0.5 space-y-0.5">
                {doDia.slice(0, 3).map((e, j) => (
                  <div key={j} className="flex items-center gap-1 truncate" title={e.titulo}>
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: camadas.find((c) => c.rotulo === e.camada)?.cor ?? CORES[0],
                      }}
                    />
                    <span className="truncate">{e.titulo}</span>
                  </div>
                ))}
                {doDia.length > 3 && (
                  <span className="text-muted-foreground">+{doDia.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Bloco>
  );
}

function WidgetRanking({ w }: { w: WidgetRenderizado }) {
  const linhas: { campanha: string; source: string | null; medium: string | null; leads: number }[] =
    w.dados?.linhas ?? [];
  const r: ResultadoCartao = {
    categorias: [], series: [], total: linhas.length, anterior: null, linhas: linhas.length,
    colunasItens: [{ chave: "posicao", rotulo: "#" }, { chave: "campanha", rotulo: "Campanha" }, { chave: "source", rotulo: "Origem" }, { chave: "medium", rotulo: "Mídia" }, { chave: "leads", rotulo: "Leads" }],
    itens: linhas.map((l, i) => ({ id: String(i), valores: { posicao: String(i + 1), campanha: l.campanha, source: l.source ?? "", medium: l.medium ?? "", leads: String(l.leads) } })),
  };
  return <div className="space-y-2"><p className="text-sm font-semibold">{w.titulo}</p><TabelaItens cartao={{ titulo: w.titulo }} r={r} /></div>;
}

function WidgetTabela({
  w,
  pagina,
  setPagina,
}: {
  w: WidgetRenderizado;
  pagina: number;
  setPagina: (p: number) => void;
}) {
  const d = w.dados ?? {};
  const colunas: string[] = d.colunas ?? [];
  const linhas: any[] = d.linhas ?? [];
  const r: ResultadoCartao = {
    categorias: [], series: [], total: linhas.length, anterior: null, linhas: linhas.length,
    colunasItens: [{ chave: "nome", rotulo: "Contato" }, { chave: "telefone", rotulo: "Telefone" }, { chave: "criadoEm", rotulo: "Criado em" }, { chave: "origem", rotulo: "Origem" }, ...colunas.map((chave) => ({ chave, rotulo: chave }))],
    itens: linhas.map((c) => ({ id: String(c.id), valores: { nome: c.nome ?? "", telefone: formatarTelefone(c.telefone), criadoEm: dataHoraBr(c.criadoEm), origem: c.utmSource ? "Anúncio" : "Orgânico", ...Object.fromEntries(colunas.map((col) => [col, formatarCelula(col, c.campos?.[col] ?? "")])) } })),
  };
  return <div className="space-y-2"><p className="text-sm font-semibold">{w.titulo}</p><TabelaItens cartao={{ titulo: w.titulo }} r={r} />
    {Number(d.totalPaginas ?? 1) > 1 && <div className="flex items-center justify-end gap-2">
      {pagina > 1 && <Button size="sm" variant="outline" onClick={() => setPagina(pagina - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button>}
      <span className="text-sm text-muted-foreground">Página {d.pagina} de {d.totalPaginas}</span>
      {pagina < Number(d.totalPaginas ?? 1) && <Button size="sm" variant="outline" onClick={() => setPagina(pagina + 1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button>}
    </div>}
  </div>;
}

/** Linha exibida (já agrupada), com o Social Seller anexado. */
type LinhaExibida = RelatorioDiarioLinha & {
  socialSeller: number;
  /** Mostra o Social Seller nesta linha (evita contar em dobro quando Atendente está visível). */
  socialVisivel: boolean;
  /** A linha representa exatamente um dia + canal + equipe (dá para editar). */
  socialEditavel: boolean;
};

type ColunaRelatorio = {
  chave: keyof Omit<LinhaExibida, "data" | "socialVisivel" | "socialEditavel" | "conversasUsuarioNovos">;
  titulo: string;
  dica: string;
  tipo: "numero" | "texto";
};

const COLUNAS_RELATORIO: ColunaRelatorio[] = [
  { chave: "novosContatos", titulo: "Novos contatos", dica: "Contatos criados pela primeira vez no dia.", tipo: "numero" },
  { chave: "novosContatosAds", titulo: "Novos contatos/ADS", dica: "Novos contatos do dia que chegaram com UTM de campanha.", tipo: "numero" },
  { chave: "conversasUsuario", titulo: "Conversas do Usuário", dica: "À esquerda, conversas com contatos novos do dia; à direita, o total (novos + antigos) atendido por humano.", tipo: "numero" },
  { chave: "conversasBot", titulo: "Conversas do bot", dica: "Contatos únicos atendidos pelo bot no dia. Um contato pode contar nas duas colunas de conversas.", tipo: "numero" },
  { chave: "conversasOrigemCanal", titulo: "Origem Canal", dica: "Conversas do dia com resposta humana real, mas sem o Elora identificar qual atendente.", tipo: "numero" },
  { chave: "conversasTotalDia", titulo: "Novas conversas no dia", dica: "Contatos únicos que tiveram alguma conversa no dia, novos ou já existentes.", tipo: "numero" },
  { chave: "consultaAgendada", titulo: "Consulta agendada", dica: "Conversas classificadas como ganho com a etiqueta de consulta agendada no dia.", tipo: "numero" },
  { chave: "consultaAgendadaAds", titulo: "Consulta agendada/ADS", dica: "Dessas consultas agendadas, as que vieram com UTM preenchido.", tipo: "numero" },
  { chave: "procedimentoVendido", titulo: "Procedimento vendido", dica: "Conversas classificadas como ganho com a etiqueta de procedimento vendido no dia.", tipo: "numero" },
  { chave: "procedimentoVendidoAds", titulo: "Procedimento vendido/ADS", dica: "Desses procedimentos vendidos, os que vieram com UTM preenchido.", tipo: "numero" },
  { chave: "canal", titulo: "Canal", dica: "Canal/plataforma da conversa (WhatsApp, Instagram, Messenger...).", tipo: "texto" },
  { chave: "atendente", titulo: "Atendente", dica: "Atendente humano responsável pela conversa.", tipo: "texto" },
  { chave: "equipe", titulo: "Equipe", dica: "Equipe/departamento responsável pela conversa.", tipo: "texto" },
];

const COLUNAS_ADS = COLUNAS_RELATORIO.filter((c) => c.titulo.endsWith("/ADS")).map((c) => c.chave as string);
const CAMPOS_SOMA = [
  "novosContatos",
  "novosContatosAds",
  "conversasUsuario",
  "conversasUsuarioNovos",
  "conversasBot",
  "conversasOrigemCanal",
  "conversasTotalDia",
  "consultaAgendada",
  "consultaAgendadaAds",
  "procedimentoVendido",
  "procedimentoVendidoAds",
] as const;
const TAMANHOS_PAGINA = [7, 15, 30, 60];

const NAO_INFORMADO = NAO_DEFINIDO;
const VALOR_NAO_INFORMADO = "nao_informado";
const rotuloDimensao = rotuloND;
const chaveValor = (v: string) => v || VALOR_NAO_INFORMADO;
const passaMulti = (sel: string[], v: string) => sel.length === 0 || sel.includes(chaveValor(v));

function FiltroMultiplo({
  rotulo,
  valores,
  selecionados,
  onChange,
  desabilitado = false,
}: {
  rotulo: string;
  valores: string[];
  selecionados: string[];
  onChange: (v: string[]) => void;
  desabilitado?: boolean;
}) {
  const texto =
    selecionados.length === 0
      ? "Todos"
      : selecionados.length === 1
        ? rotuloDimensao(selecionados[0] === VALOR_NAO_INFORMADO ? "" : selecionados[0])
        : `${selecionados.length} selecionados`;
  return (
    <div className="space-y-1">
      <Label className="block text-xs text-muted-foreground">{rotulo}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-40 justify-between font-normal" disabled={desabilitado}>
            <span className="truncate">{texto}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-72 w-56 space-y-2 overflow-auto">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={selecionados.length === 0} onCheckedChange={() => onChange([])} />
            Todos
          </label>
          {valores.map((v) => {
            const k = chaveValor(v);
            return (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selecionados.includes(k)}
                  onCheckedChange={(c) =>
                    onChange(c ? [...selecionados, k] : selecionados.filter((s) => s !== k))
                  }
                />
                {rotuloDimensao(v)}
              </label>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const formatarDataBr = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const ORDEM_PADRAO = COLUNAS_RELATORIO.map((c) => c.chave as string);
const normalizarOrdem = (o: unknown): string[] => {
  const lista = Array.isArray(o) ? o.filter((x): x is string => ORDEM_PADRAO.includes(x as string)) : [];
  const unicos = [...new Set(lista)];
  return [...unicos, ...ORDEM_PADRAO.filter((k) => !unicos.includes(k))];
};

function CabecalhoOrdenavel({ c, travado }: { c: ColunaRelatorio; travado: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.chave, disabled: travado });
  return (
    <TableHead
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`whitespace-nowrap ${alinhamento(c.tipo === "numero")}`}
    >
      <span className="inline-flex items-center gap-1">
        {!travado && (
          <button
            type="button"
            aria-label={`Arrastar coluna ${c.titulo}`}
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <UiTooltipProvider>
          <UiTooltip>
            <UiTooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1">
                {c.titulo}
                <Info className="h-3 w-3 text-muted-foreground" />
              </span>
            </UiTooltipTrigger>
            <UiTooltipContent className="max-w-64">{c.dica}</UiTooltipContent>
          </UiTooltip>
        </UiTooltipProvider>
      </span>
    </TableHead>
  );
}

/** Matriz do relatório diário: uma linha por dia, mais recente no topo. */
export function MatrizDimensionalLegada({ clienteId }: { clienteId: string }) {
  const chaveOrdem = `elora.relatorio.ordem.${clienteId}`;
  const [de, setDe] = useState(diasAtrasIso(30));
  const [ate, setAte] = useState(hojeIso());
  const [linhas, setLinhas] = useState<RelatorioDiarioLinha[] | null>(null);
  const [social, setSocial] = useState<{ data: string; canal: string; equipe: string; valor: number }[]>([]);
  const [equipeInterna, setEquipeInterna] = useState(false);
  const [porPagina, setPorPagina] = useState(15);
  const [paginaRel, setPaginaRel] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [canalSel, setCanalSel] = useState<string[]>([]);
  const [atendenteSel, setAtendenteSel] = useState<string[]>([]);
  const [equipeSel, setEquipeSel] = useState<string[]>([]);
  const [colunasVisiveis, setColunasVisiveis] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUNAS_RELATORIO.map((c) => [c.chave, true])),
  );
  const [ordem, setOrdem] = useState<string[]>(ORDEM_PADRAO);

  const travado = false;
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Ordem salva no navegador.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chaveOrdem);
      if (raw) setOrdem(normalizarOrdem(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [chaveOrdem]);


  const periodoInvalido = !de || !ate || de > ate;

  useEffect(() => {
    if (periodoInvalido) return;
    setCarregando(true);
    getRelatorioDiarioCliente({ data: { clienteId, de, ate } })
      .then((r) => {
        setLinhas(r.linhas);
        setEquipeInterna(r.equipeInterna);
      })
      .catch((e) => {
        setLinhas(null);
        toast.error(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setCarregando(false));
  }, [clienteId, de, ate, periodoInvalido]);

  const distintos = useCallback(
    (campo: "canal" | "atendente" | "equipe") =>
      [...new Set((linhas ?? []).map((l) => l[campo]))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [linhas],
  );
  const canais = useMemo(() => distintos("canal"), [distintos]);
  // Atendente em branco não representa uma pessoa: fica fora das opções.
  const atendentes = useMemo(() => distintos("atendente").filter((a) => a !== ""), [distintos]);
  const equipes = useMemo(() => distintos("equipe"), [distintos]);

  const linhasFiltradas = useMemo(
    () =>
      (linhas ?? []).filter(
        (l) => passaMulti(canalSel, l.canal) && passaMulti(atendenteSel, l.atendente) && passaMulti(equipeSel, l.equipe),
      ),
    [linhas, canalSel, atendenteSel, equipeSel],
  );

  const colunasExibidas = useMemo(
    () =>
      ordem
        .map((k) => COLUNAS_RELATORIO.find((c) => c.chave === k)!)
        .filter((c) => c && colunasVisiveis[c.chave] !== false),
    [colunasVisiveis, ordem],
  );

  const verCanal = colunasVisiveis.canal !== false;
  const verAtendente = colunasVisiveis.atendente !== false;
  const verEquipe = colunasVisiveis.equipe !== false;

  // Reagrupa pelas dimensões visíveis (Data é sempre a base) e anexa o Social Seller.
  const linhasAgrupadas = useMemo<LinhaExibida[]>(() => {
    const mapaSocial = new Map(social.map((s) => [`${s.data}|${s.canal}|${s.equipe}`, s.valor]));
    const grupos = new Map<string, { linha: RelatorioDiarioLinha; pares: Set<string> }>();
    for (const l of linhasFiltradas) {
      const k = [l.data, verCanal ? l.canal : "", verAtendente ? l.atendente : "", verEquipe ? l.equipe : ""].join("|");
      const par = `${l.data}|${l.canal}|${l.equipe}`;
      const g = grupos.get(k);
      if (!g) {
        grupos.set(k, {
          linha: {
            ...l,
            canal: verCanal ? l.canal : "",
            atendente: verAtendente ? l.atendente : "",
            equipe: verEquipe ? l.equipe : "",
          },
          pares: new Set([par]),
        });
      } else {
        for (const c of CAMPOS_SOMA) g.linha[c] += l[c];
        g.pares.add(par);
      }
    }
    const usados = new Set<string>();
    const editavelBase = verCanal && verEquipe && !verAtendente;
    return [...grupos.values()]
      .sort((a, b) => (a.linha.data < b.linha.data ? 1 : a.linha.data > b.linha.data ? -1 : 0))
      .map(({ linha, pares }) => {
        let soma = 0;
        let algum = false;
        for (const p of pares) {
          if (usados.has(p)) continue;
          usados.add(p);
          algum = true;
          soma += mapaSocial.get(p) ?? 0;
        }
        return { ...linha, socialSeller: soma, socialVisivel: algum, socialEditavel: editavelBase && algum };
      });
  }, [linhasFiltradas, social, verCanal, verAtendente, verEquipe]);

  const totalPaginasRel = Math.max(1, Math.ceil(linhasAgrupadas.length / porPagina));
  useEffect(() => {
    setPaginaRel(1);
  }, [canalSel, atendenteSel, equipeSel, colunasVisiveis, de, ate, porPagina]);
  const paginaAtual = Math.min(paginaRel, totalPaginasRel);
  const linhasPagina = linhasAgrupadas.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  const adsVisiveis = COLUNAS_ADS.every((k) => colunasVisiveis[k] !== false);
  const alternarAds = (v: boolean) =>
    setColunasVisiveis((s) => ({ ...s, ...Object.fromEntries(COLUNAS_ADS.map((k) => [k, v])) }));

  const aoSoltar = (e: DragEndEvent) => {
    if (travado || !e.over || e.active.id === e.over.id) return;
    const nova = arrayMove(ordem, ordem.indexOf(String(e.active.id)), ordem.indexOf(String(e.over.id)));
    setOrdem(nova);
    try {
      window.localStorage.setItem(chaveOrdem, JSON.stringify(nova));
    } catch {
      /* ignore */
    }
  };

  const totais = useMemo(() => {
    const t = {} as Record<string, number>;
    for (const c of CAMPOS_SOMA) t[c] = linhasAgrupadas.reduce((s, l) => s + l[c], 0);
    t.socialSeller = linhasAgrupadas.reduce((s, l) => s + l.socialSeller, 0);
    return t;
  }, [linhasAgrupadas]);

  const valorCelula = (c: ColunaRelatorio, l: LinhaExibida | null): string => {
    if (c.chave === "conversasUsuario") {
      return l ? `${l.conversasUsuarioNovos} - ${l.conversasUsuario}` : `${totais.conversasUsuarioNovos} - ${totais.conversasUsuario}`;
    }
    if (c.tipo === "texto") return l ? rotuloDimensao(String(l[c.chave])) : "—";
    if (c.chave === "socialSeller" && l && !l.socialVisivel) return "—";
    return String(l ? l[c.chave] : totais[c.chave]);
  };


  const matrizExport = () => {
    const celulas = (l: LinhaExibida | null): (string | number)[] =>
      colunasExibidas.flatMap((c): (string | number)[] => {
        if (c.chave === "conversasUsuario") {
          return l ? [l.conversasUsuarioNovos, l.conversasUsuario] : [totais.conversasUsuarioNovos, totais.conversasUsuario];
        }
        if (c.tipo === "texto") return [l ? rotuloDimensao(String(l[c.chave])) : "—"];
        if (c.chave === "socialSeller" && l && !l.socialVisivel) return ["—"];
        return [Number(l ? l[c.chave] : totais[c.chave])];
      });
    const cab = [
      "Data",
      ...colunasExibidas.flatMap((c) =>
        c.chave === "conversasUsuario" ? ["Conversas do Usuário (novos)", "Conversas do Usuário (total)"] : [c.titulo],
      ),
    ];
    const total = ["Total", ...celulas(null)];
    const corpo = linhasAgrupadas.map((l) => [formatarDataBr(l.data), ...celulas(l)]);
    return { cab, total, corpo };
  };
  const nomeArquivo = `relatorio-diario-${clienteId}-${de}-a-${ate}`;

  const exportar = async (formato: "csv" | "xlsx" | "pdf") => {
    const { cab, total, corpo } = matrizExport();
    try {
      if (formato === "csv") {
        const esc = (v: unknown) => {
          const s = String(v);
          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = [cab, total, ...corpo].map((r) => r.map(esc).join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomeArquivo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (formato === "xlsx") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([cab, total, ...corpo]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório diário");
        XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
      } else {
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
        doc.setFontSize(14);
        doc.text("Relatório diário", 40, 40);
        doc.setFontSize(9);
        doc.text(`Período: ${formatarDataBr(de)} a ${formatarDataBr(ate)}`, 40, 56);
        autoTable(doc, {
          startY: 68,
          head: [cab, total.map(String)],
          body: corpo.map((r) => r.map(String)),
          styles: { fontSize: 7, cellPadding: 3 },
          headStyles: { fillColor: [30, 41, 59] },
          margin: { left: 40, right: 40 },
        });
        doc.save(`${nomeArquivo}.pdf`);
      }
    } catch (e) {
      toast.error("Não foi possível exportar. Tente novamente.");
      console.error(e);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Matriz por dimensões
            </CardTitle>
            <CardDescription>Números de cada dia, enviados pela automação.</CardDescription>
          </div>
          <UiTooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <label className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={adsVisiveis} onCheckedChange={alternarAds} aria-label="Mostrar colunas de ADS" />
                ADS
              </label>
              <BarraTabela
                colunas={COLUNAS_RELATORIO.map((c) => ({ chave: c.chave, rotulo: c.titulo }))}
                estado={{ ordem, ocultas: COLUNAS_RELATORIO.filter((c) => colunasVisiveis[c.chave] === false).map((c) => c.chave), fixas: [] }}
                padrao={{ ordem: ORDEM_PADRAO, ocultas: [], fixas: [] }} semFixar
                onEstado={(e) => { if (travado) return; setOrdem(e.ordem); setColunasVisiveis(Object.fromEntries(COLUNAS_RELATORIO.map((c) => [c.chave, !e.ocultas.includes(c.chave)]))); }}
                onExportar={(f) => void exportar(f)} />
            </div>
          </UiTooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="rel-de" className="text-xs text-muted-foreground">Data inicial</Label>
            <Input id="rel-de" type="date" className="w-40" value={de} disabled={travado} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rel-ate" className="text-xs text-muted-foreground">Data final</Label>
            <Input id="rel-ate" type="date" className="w-40" value={ate} disabled={travado} onChange={(e) => setAte(e.target.value)} />
          </div>
          <FiltroMultiplo rotulo="Canal" valores={canais} selecionados={canalSel} onChange={setCanalSel} desabilitado={travado} />
          <FiltroMultiplo rotulo="Atendente" valores={atendentes} selecionados={atendenteSel} onChange={setAtendenteSel} desabilitado={travado} />
          <FiltroMultiplo rotulo="Equipe" valores={equipes} selecionados={equipeSel} onChange={setEquipeSel} desabilitado={travado} />
        </div>
        {periodoInvalido && (
          <p className="text-sm text-destructive">A data inicial precisa ser anterior ou igual à data final.</p>
        )}
        {carregando && !periodoInvalido && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!carregando && !periodoInvalido && (!linhas || linhas.length === 0) && (
          <p className="rounded-lg border border-border/60 py-6 text-center text-sm text-muted-foreground">
            Nenhum dia com relatório neste período ainda. Quando a automação enviar os números,
            eles aparecem aqui.
          </p>
        )}
        {!carregando && !periodoInvalido && linhas && linhas.length > 0 && (
          <div className="space-y-2">
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-border/60">
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_var(--border)]">
                  <TableRow className="bg-card hover:bg-card">
                    <TableHead className="sticky left-0 z-30 whitespace-nowrap bg-card">Data</TableHead>
                    <SortableContext items={colunasExibidas.map((c) => c.chave)} strategy={horizontalListSortingStrategy}>
                      {colunasExibidas.map((c) => (
                        <CabecalhoOrdenavel key={c.chave} c={c} travado={travado} />
                      ))}
                    </SortableContext>
                  </TableRow>
                  <TableRow className="bg-muted font-semibold hover:bg-muted">
                    <TableCell className="sticky left-0 z-30 whitespace-nowrap bg-muted">Total</TableCell>
                    {colunasExibidas.map((c) => (
                      <TableCell key={c.chave} className={`whitespace-nowrap ${alinhamento(c.tipo === "numero")}`}>
                        {valorCelula(c, null)}
                      </TableCell>
                    ))}
                  </TableRow>
                </thead>
                <TableBody>
                  {linhasPagina.map((l) => {
                    const chaveLinha = `${l.data}|${l.canal}|${l.atendente}|${l.equipe}`;
                    return (
                      <TableRow key={chaveLinha} className="group">
                        <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-card group-hover:bg-muted">
                          {formatarDataBr(l.data)}
                        </TableCell>
                        {colunasExibidas.map((c) => (
                          <TableCell
                            key={c.chave}
                            className={`whitespace-nowrap ${alinhamento(c.tipo === "numero")}`}
                          >
                            {valorCelula(c, l)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </table>
            </DndContext>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Linhas por página
              <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                <SelectTrigger className="h-8 w-20" aria-label="Linhas por página">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAMANHOS_PAGINA.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPaginasRel > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={paginaAtual <= 1} onClick={() => setPaginaRel(paginaAtual - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaAtual} de {totalPaginasRel}
                </span>
                <Button size="sm" variant="outline" disabled={paginaAtual >= totalPaginasRel} onClick={() => setPaginaRel(paginaAtual + 1)}>
                  Próxima <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          </div>
        )}
        {!carregando && !periodoInvalido && linhas && linhas.length > 0 && linhasAgrupadas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma linha com esses filtros.</p>
        )}
      </CardContent>

    </Card>
  );
}

/** Painel do cliente: renderiza exatamente os widgets configurados, na ordem definida. */
export function ResultadosCliente({
  clienteId,
  visaoId = null,
  recarregarChave = 0,
}: {
  clienteId: string;
  visaoId?: string | null;
  recarregarChave?: number;
}) {
  const [modo, setModo] = useState<"7" | "30" | "custom">("30");
  const [deCustom, setDeCustom] = useState(diasAtrasIso(30));
  const [ateCustom, setAteCustom] = useState(hojeIso());
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Resultados | null>(null);
  const [carregando, setCarregando] = useState(true);

  const de = modo === "custom" ? deCustom : diasAtrasIso(modo === "7" ? 7 : 30);
  const ate = modo === "custom" ? ateCustom : hojeIso();

  const carregar = useCallback(() => {
    setCarregando(true);
    getResultadosCliente({ data: { clienteId, de, ate, pagina, porPagina: POR_PAGINA, visaoId } })
      .then(setDados)
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, de, ate, pagina, visaoId, recarregarChave]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const trocarPeriodo = (m: typeof modo) => {
    setModo(m);
    setPagina(1);
  };

  const widgets = dados?.widgets ?? [];
  const grade = useMemo(() => normalizarGrade(widgets), [widgets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Resultados da conta
        </CardTitle>
        <CardDescription>Dados vindos do seu aplicativo Elora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { v: "7", l: "Últimos 7 dias" },
                { v: "30", l: "Últimos 30 dias" },
                { v: "custom", l: "Personalizado" },
              ] as const
            ).map((o) => (
              <Button
                key={o.v}
                size="sm"
                variant={modo === o.v ? "secondary" : "outline"}
                onClick={() => trocarPeriodo(o.v)}
              >
                {o.l}
              </Button>
            ))}
          </div>
          {modo === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="res-de" className="text-xs text-muted-foreground">De</Label>
                <Input
                  id="res-de"
                  type="date"
                  className="w-40"
                  value={deCustom}
                  onChange={(e) => {
                    setDeCustom(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="res-ate" className="text-xs text-muted-foreground">Até</Label>
                <Input
                  id="res-ate"
                  type="date"
                  className="w-40"
                  value={ateCustom}
                  onChange={(e) => {
                    setAteCustom(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {carregando && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!carregando && widgets.length === 0 && (
          <p className="rounded-lg border border-border/60 py-6 text-center text-sm text-muted-foreground">
            Nenhum painel configurado ainda.
          </p>
        )}

        {!carregando && widgets.length > 0 && (
          <DashboardGrid
            itens={grade}
            editavel={false}
            renderItem={(g) => {
              const w = g.item;
              return (
                <div className="h-full">
                  {w.tipo === "metrico" && <WidgetMetrico w={w} />}
                  {w.tipo === "pizza" && <WidgetPizza w={w} />}
                  {w.tipo === "barras" && <WidgetBarras w={w} />}
                  {w.tipo === "calendario" && <WidgetCalendario w={w} />}
                  {w.tipo === "ranking" && <WidgetRanking w={w} />}
                  {w.tipo === "tabela" && <WidgetTabela w={w} pagina={pagina} setPagina={setPagina} />}
                </div>
              );
            }}
          />
        )}

        {!carregando && dados && (
          <p className="text-xs text-muted-foreground">
            {dados.totalContatos} contato{dados.totalContatos === 1 ? "" : "s"} no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
