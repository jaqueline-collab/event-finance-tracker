import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, GripVertical, Info, Loader2, Lock, Megaphone, Snowflake, UserRound, Users, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  congelarVisualizacao,
  descongelarVisualizacao,
  getFiltroCongelado,
  listarUsuariosCongelaveis,
  type FiltrosCongelados,
} from "@/lib/relatorio-congelado.functions";
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
              <Legend />
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
  return (
    <div className="min-w-0 max-w-full space-y-2">
      <p className="text-sm font-semibold">{w.titulo}</p>
      {linhas.length === 0 ? (
        <p className="rounded-lg border border-border/60 py-6 text-center text-sm text-muted-foreground">
          Nenhuma campanha no período.
        </p>
      ) : (
        <div className="w-0 min-w-full overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Mídia</TableHead>
                <TableHead className="text-right">Leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((r, i) => (
                <TableRow key={r.campanha}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.campanha}</TableCell>
                  <TableCell>{r.source ?? "—"}</TableCell>
                  <TableCell>{r.medium ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.leads}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
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
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{w.titulo}</p>
      {linhas.length === 0 ? (
        <p className="rounded-lg border border-border/60 py-6 text-center text-sm text-muted-foreground">
          Nenhum contato sincronizado neste período ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Origem</TableHead>
                {colunas.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome ?? "—"}</TableCell>
                  <TableCell>{c.telefone ?? "—"}</TableCell>
                  <TableCell>{dataHoraBr(c.criadoEm)}</TableCell>
                  <TableCell>
                    {c.utmSource ? (
                      <Badge
                        variant="secondary"
                        title={`Origem: ${c.utmSource}${c.utmMedium ? ` · Mídia: ${c.utmMedium}` : ""}${c.utmCampaign ? ` · Campanha: ${c.utmCampaign}` : ""}`}
                      >
                        <Megaphone className="mr-1 h-3 w-3" /> Anúncio
                      </Badge>
                    ) : (
                      <Badge variant="outline">Orgânico</Badge>
                    )}
                  </TableCell>
                  {colunas.map((col) => (
                    <TableCell key={col}>{c.campos?.[col] ?? "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {Number(d.totalPaginas ?? 1) > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pagina <= 1}
            onClick={() => setPagina(Math.max(1, pagina - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {d.pagina} de {d.totalPaginas}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pagina >= Number(d.totalPaginas ?? 1)}
            onClick={() => setPagina(pagina + 1)}
          >
            Próxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

type ColunaRelatorio = {
  chave: keyof Omit<RelatorioDiarioLinha, "data">;
  titulo: string;
  dica: string;
  tipo: "numero" | "texto";
};

const COLUNAS_RELATORIO: ColunaRelatorio[] = [
  { chave: "novosContatos", titulo: "Novos contatos", dica: "Contatos criados pela primeira vez no dia.", tipo: "numero" },
  { chave: "novosContatosAds", titulo: "Novos contatos/ADS", dica: "Novos contatos do dia que chegaram com UTM de campanha.", tipo: "numero" },
  { chave: "conversasUsuario", titulo: "Conversas do Usuário", dica: "Contatos únicos atendidos por um atendente humano no dia.", tipo: "numero" },
  { chave: "conversasBot", titulo: "Conversas do bot", dica: "Contatos únicos atendidos pelo bot no dia. Um contato pode contar nas duas colunas de conversas.", tipo: "numero" },
  { chave: "consultaAgendada", titulo: "Consulta agendada", dica: "Conversas classificadas como ganho com a etiqueta de consulta agendada no dia.", tipo: "numero" },
  { chave: "consultaAgendadaAds", titulo: "Consulta agendada/ADS", dica: "Dessas consultas agendadas, as que vieram com UTM preenchido.", tipo: "numero" },
  { chave: "procedimentoVendido", titulo: "Procedimento vendido", dica: "Conversas classificadas como ganho com a etiqueta de procedimento vendido no dia.", tipo: "numero" },
  { chave: "procedimentoVendidoAds", titulo: "Procedimento vendido/ADS", dica: "Desses procedimentos vendidos, os que vieram com UTM preenchido.", tipo: "numero" },
  { chave: "canal", titulo: "Canal", dica: "Canal/plataforma da conversa (WhatsApp, Instagram, Messenger...).", tipo: "texto" },
  { chave: "atendente", titulo: "Atendente", dica: "Atendente humano responsável pela conversa, ou \"Bot\"/\"Automação\" quando não houve humano envolvido.", tipo: "texto" },
  { chave: "equipe", titulo: "Equipe", dica: "Equipe/departamento responsável pela conversa.", tipo: "texto" },
];

const NAO_INFORMADO = "Não informado";
const VALOR_NAO_INFORMADO = "nao_informado";
const rotuloDimensao = (v: string) => (v ? v : NAO_INFORMADO);
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
      className={`whitespace-nowrap ${c.tipo === "numero" ? "text-right" : "text-left"}`}
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
function SecaoRelatorioDiario({ clienteId }: { clienteId: string }) {
  const chaveOrdem = `elora.relatorio.ordem.${clienteId}`;
  const [de, setDe] = useState(diasAtrasIso(30));
  const [ate, setAte] = useState(hojeIso());
  const [linhas, setLinhas] = useState<RelatorioDiarioLinha[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [canalSel, setCanalSel] = useState<string[]>([]);
  const [atendenteSel, setAtendenteSel] = useState<string[]>([]);
  const [equipeSel, setEquipeSel] = useState<string[]>([]);
  const [colunasVisiveis, setColunasVisiveis] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUNAS_RELATORIO.map((c) => [c.chave, true])),
  );
  const [ordem, setOrdem] = useState<string[]>(ORDEM_PADRAO);
  const [congelado, setCongelado] = useState<FiltrosCongelados | null>(null);
  const [podeCongelar, setPodeCongelar] = useState(false);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState(false);
  const [alvo, setAlvo] = useState<"eu" | "usuario">("eu");
  const [usuarioAlvo, setUsuarioAlvo] = useState("");
  const [usuarios, setUsuarios] = useState<{ userId: string; nome: string; email: string; congelado: boolean }[]>([]);
  const [salvandoCong, setSalvandoCong] = useState(false);

  const travado = Boolean(congelado);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Ordem salva no navegador (fora do modo congelado).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chaveOrdem);
      if (raw) setOrdem(normalizarOrdem(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [chaveOrdem]);

  const aplicarCongelado = (f: FiltrosCongelados) => {
    setCanalSel(f.canais);
    setAtendenteSel(f.atendentes);
    setEquipeSel(f.equipes);
    setDe(f.data_inicial);
    setAte(f.data_final);
    setColunasVisiveis(Object.fromEntries(COLUNAS_RELATORIO.map((c) => [c.chave, f.colunas_visiveis.includes(c.chave)])));
    setOrdem(normalizarOrdem(f.ordem_colunas));
  };

  const carregarCongelado = useCallback(() => {
    getFiltroCongelado({ data: { clienteId } })
      .then((r) => {
        setPodeCongelar(r.podeCongelar);
        setMeuId(r.userId);
        setCongelado(r.filtros);
        if (r.filtros) aplicarCongelado(r.filtros);
      })
      .catch(() => {
        /* sem trava */
      });
  }, [clienteId]);

  useEffect(carregarCongelado, [carregarCongelado]);

  const periodoInvalido = !de || !ate || de > ate;

  useEffect(() => {
    if (periodoInvalido) return;
    setCarregando(true);
    getRelatorioDiarioCliente({ data: { clienteId, de, ate } })
      .then((r) => setLinhas(r.linhas))
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
  const atendentes = useMemo(() => distintos("atendente"), [distintos]);
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
    for (const c of COLUNAS_RELATORIO) {
      if (c.tipo !== "numero") continue;
      t[c.chave] = linhasFiltradas.reduce((s, l) => s + (Number(l[c.chave]) || 0), 0);
    }
    return t;
  }, [linhasFiltradas]);

  const abrirDialogo = () => {
    setAlvo("eu");
    setUsuarioAlvo("");
    setDialogo(true);
    listarUsuariosCongelaveis({ data: { clienteId } })
      .then(setUsuarios)
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  };

  const confirmarCongelar = async () => {
    const usuarioAlvoId = alvo === "eu" ? meuId : usuarioAlvo;
    if (!usuarioAlvoId) {
      toast.error("Escolha um usuário.");
      return;
    }
    setSalvandoCong(true);
    try {
      await congelarVisualizacao({
        data: {
          clienteId,
          usuarioAlvoId,
          filtros: {
            canais: canalSel,
            atendentes: atendenteSel,
            equipes: equipeSel,
            data_inicial: de,
            data_final: ate,
            colunas_visiveis: COLUNAS_RELATORIO.filter((c) => colunasVisiveis[c.chave] !== false).map((c) => c.chave),
            ordem_colunas: ordem,
          },
        },
      });
      toast.success("Visualização congelada.");
      setDialogo(false);
      if (usuarioAlvoId === meuId) carregarCongelado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível congelar.");
    } finally {
      setSalvandoCong(false);
    }
  };

  const descongelar = async (usuarioAlvoId: string) => {
    try {
      await descongelarVisualizacao({ data: { clienteId, usuarioAlvoId } });
      toast.success("Visualização liberada.");
      if (usuarioAlvoId === meuId) setCongelado(null);
      setUsuarios((u) => u.map((x) => (x.userId === usuarioAlvoId ? { ...x, congelado: false } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível descongelar.");
    }
  };

  const matrizExport = () => {
    const cab = ["Data", ...colunasExibidas.map((c) => c.titulo)];
    const total = ["Total", ...colunasExibidas.map((c) => (c.tipo === "numero" ? totais[c.chave] : "—"))];
    const corpo = linhasFiltradas.map((l) => [
      formatarDataBr(l.data),
      ...colunasExibidas.map((c) => (c.tipo === "texto" ? rotuloDimensao(String(l[c.chave])) : Number(l[c.chave]))),
    ]);
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
              <CalendarDays className="h-4 w-4" /> Relatório diário
            </CardTitle>
            <CardDescription>Números de cada dia, enviados pela automação.</CardDescription>
          </div>
          <UiTooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Popover>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9" disabled={travado} aria-label="Colunas">
                        <Columns3 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <UiTooltipContent>Colunas</UiTooltipContent>
                </UiTooltip>
                <PopoverContent align="end" className="w-64 space-y-2">
                  {COLUNAS_RELATORIO.map((c) => (
                    <label key={c.chave} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={colunasVisiveis[c.chave] !== false}
                        onCheckedChange={(v) => setColunasVisiveis((s) => ({ ...s, [c.chave]: v !== false }))}
                      />
                      {c.titulo}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9" disabled={linhasFiltradas.length === 0} aria-label="Exportar">
                        <Download className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <UiTooltipContent>Exportar</UiTooltipContent>
                </UiTooltip>
                <PopoverContent align="end" className="w-40 p-1">
                  {(["csv", "xlsx", "pdf"] as const).map((f) => (
                    <Button key={f} variant="ghost" size="sm" className="w-full justify-start" onClick={() => exportar(f)}>
                      {f.toUpperCase()}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
              {podeCongelar && (
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={abrirDialogo} aria-label="Congelar visualização">
                      <Snowflake className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <UiTooltipContent>Congelar visualização</UiTooltipContent>
                </UiTooltip>
              )}
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
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={travado}>
                <Columns3 className="h-4 w-4" /> Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-2">
              {COLUNAS_RELATORIO.map((c) => (
                <label key={c.chave} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colunasVisiveis[c.chave] !== false}
                    onCheckedChange={(v) => setColunasVisiveis((s) => ({ ...s, [c.chave]: v !== false }))}
                  />
                  {c.titulo}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled={linhasFiltradas.length === 0}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              {(["csv", "xlsx", "pdf"] as const).map((f) => (
                <Button key={f} variant="ghost" size="sm" className="w-full justify-start" onClick={() => exportar(f)}>
                  {f.toUpperCase()}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
          {podeCongelar && (
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={abrirDialogo}>
              <Snowflake className="h-4 w-4" /> Congelar visualização
            </Button>
          )}
        </div>
        {travado && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Visualização congelada
            </span>
            {podeCongelar && meuId && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void descongelar(meuId)}>
                Descongelar
              </Button>
            )}
          </div>
        )}
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
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-border/60">
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
                  <TableRow className="bg-card hover:bg-card">
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <SortableContext items={colunasExibidas.map((c) => c.chave)} strategy={horizontalListSortingStrategy}>
                      {colunasExibidas.map((c) => (
                        <CabecalhoOrdenavel key={c.chave} c={c} travado={travado} />
                      ))}
                    </SortableContext>
                  </TableRow>
                  <TableRow className="bg-muted font-semibold hover:bg-muted">
                    <TableCell className="whitespace-nowrap">Total</TableCell>
                    {colunasExibidas.map((c) => (
                      <TableCell key={c.chave} className={c.tipo === "numero" ? "text-right tabular-nums" : "text-left"}>
                        {c.tipo === "numero" ? totais[c.chave] : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                </thead>
                <TableBody>
                  {linhasFiltradas.map((l, i) => (
                    <TableRow key={`${l.data}-${l.canal}-${l.atendente}-${l.equipe}-${i}`}>
                      <TableCell className="whitespace-nowrap">{formatarDataBr(l.data)}</TableCell>
                      {colunasExibidas.map((c) => (
                        <TableCell key={c.chave} className={c.tipo === "numero" ? "text-right tabular-nums" : "text-left whitespace-nowrap"}>
                          {c.tipo === "texto" ? rotuloDimensao(String(l[c.chave])) : l[c.chave]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </DndContext>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogo} onOpenChange={setDialogo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Congelar visualização</DialogTitle>
            <DialogDescription>
              Os filtros, o período, as colunas e a ordem que estão na tela ficam travados para quem você escolher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">Aplicar para:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant={alvo === "eu" ? "secondary" : "outline"} onClick={() => setAlvo("eu")} className="justify-start gap-2">
                <UserRound className="h-4 w-4" /> Minha própria visualização
              </Button>
              <Button variant={alvo === "usuario" ? "secondary" : "outline"} onClick={() => setAlvo("usuario")} className="justify-start gap-2">
                <Users className="h-4 w-4" /> Selecionar usuário
              </Button>
            </div>
            {alvo === "usuario" && (
              <div className="max-h-60 space-y-1 overflow-auto rounded-md border border-border/60 p-1">
                {usuarios.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">Nenhum login deste cliente entrou ainda.</p>
                )}
                {usuarios.map((u) => (
                  <div
                    key={u.userId}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm ${usuarioAlvo === u.userId ? "bg-secondary" : "hover:bg-muted"}`}
                  >
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setUsuarioAlvo(u.userId)}>
                      <p className="truncate font-medium">{u.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </button>
                    {u.congelado && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void descongelar(u.userId)}>
                        Descongelar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(false)}>Cancelar</Button>
            <Button onClick={() => void confirmarCongelar()} disabled={salvandoCong}>
              {salvandoCong && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Congelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** Painel do cliente: renderiza exatamente os widgets configurados, na ordem definida. */
export function ResultadosCliente({
  clienteId,
  conta,
  equipe,
}: {
  clienteId: string;
  conta?: React.ReactNode;
  equipe?: React.ReactNode;
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
    getResultadosCliente({ data: { clienteId, de, ate, pagina, porPagina: POR_PAGINA } })
      .then(setDados)
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, [clienteId, de, ate, pagina]);

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
    <Tabs defaultValue="dash">
      <TabsList className="h-auto flex-wrap justify-start">
        <TabsTrigger value="dash" className="gap-1.5">
          <BarChart3 className="h-4 w-4" /> Dash
        </TabsTrigger>
        <TabsTrigger value="relatorio" className="gap-1.5">
          <CalendarDays className="h-4 w-4" /> Relatório diário
        </TabsTrigger>
        {conta && (
          <TabsTrigger value="conta" className="gap-1.5">
            <Wallet className="h-4 w-4" /> Conta
          </TabsTrigger>
        )}
        {equipe && (
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="h-4 w-4" /> Minha equipe
          </TabsTrigger>
        )}
      </TabsList>
      {conta && <TabsContent value="conta" className="mt-3">{conta}</TabsContent>}
      {equipe && <TabsContent value="equipe" className="mt-3">{equipe}</TabsContent>}
      <TabsContent value="relatorio" className="mt-3">
        <SecaoRelatorioDiario clienteId={clienteId} />
      </TabsContent>
      <TabsContent value="dash" className="mt-3">
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
      </TabsContent>
    </Tabs>
  );
}
