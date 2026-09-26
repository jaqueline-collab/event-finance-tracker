import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, ChevronLeft, ChevronRight, Loader2, Megaphone } from "lucide-react";
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
import { getResultadosCliente, type WidgetRenderizado } from "@/lib/integracao-elora.functions";
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

/** Painel do cliente: renderiza exatamente os widgets configurados, na ordem definida. */
export function ResultadosCliente({ clienteId }: { clienteId: string }) {
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
