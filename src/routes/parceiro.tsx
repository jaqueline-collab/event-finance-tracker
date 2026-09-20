import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getFinanceiroParceiro,
  getPainelParceiro,
  getPlanosCalculadoraParceiro,
} from "@/lib/parceiro.functions";
import {
  calcularMargemParceiro,
  calcularOrcamentoParceiro,
  canaisZapiDerivados,
  type ConfiguracaoCalculadoraParceiro,
  type MargemParceiro,
  type PlanoCalculadoraParceiro,
} from "@/lib/parceiro.calculadora";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  GraduationCap,
  History,
  PackageOpen,
  Globe,
  Calculator,
  LayoutGrid,
  Receipt,
  Users,
  X,
} from "lucide-react";

const ANO_INICIAL = 2026;

const searchSchema = z.object({
  como: fallback(z.string(), "").default(""),
  aba: fallback(z.enum(["clientes", "financeiro", "calculadora"]), "clientes").default("clientes"),
  grafico: fallback(z.enum(["fluxo", "ativos"]), "fluxo").default("fluxo"),
  ano: fallback(z.number().int(), 0).default(0),
});

export const Route = createFileRoute("/parceiro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Área do Parceiro · Elora" },
      { name: "description", content: "Acompanhe os clientes vinculados à sua parceria, setups, histórico de movimentos e fechamentos liberados." },
      { property: "og:title", content: "Área do Parceiro · Elora" },
      { property: "og:description", content: "Clientes vinculados, setups, histórico de movimentos e financeiro da sua carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaParceiro,
});

const APP_LOGIN_URL = "https://app.eloracrm.com.br/";
const APRESENTACAO_URL =
  "https://docs.google.com/presentation/d/1roYM3Uw23zYmkZq0hzOQFbDKtMzuyPiUU4--BBKij-s/edit?usp=drive_link";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBr = (v?: string | null) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

/** Rótulo amigável do tipo de movimento no histórico (nunca exibe valores). */
const rotuloTipoMovimento = (tipo: string) =>
  ({
    setup: "Setup / Ativação",
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    alterar_plano: "Alteração de plano",
    churn: "Churn",
    servico: "Serviço avulso",
    acompanhamento: "Ajuste de acompanhamento",
    parceiro: "Alteração de parceiro",
  })[tipo] ?? tipo;

const mesLabel = (chave: string) => {
  const [a, m] = chave.split("-");
  return `${m}/${a.slice(2)}`;
};

const hojeIso = () => new Date().toISOString().slice(0, 10);
const umAnoAtrasIso = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const mediana = (valores: number[]) => {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  return ord.length % 2 === 0 ? (ord[meio - 1] + ord[meio]) / 2 : ord[meio];
};

/** Tempo de vida em dias: do setup até hoje (ativo) ou até o churn. */
const ltvDias = (c: { dataInicio?: string | null; dataChurn?: string | null }) => {
  if (!c.dataInicio) return null;
  const inicio = new Date(`${c.dataInicio}T12:00:00`).getTime();
  const fim = new Date(`${c.dataChurn ?? hojeIso()}T12:00:00`).getTime();
  return Math.max(0, Math.floor((fim - inicio) / (1000 * 60 * 60 * 24)));
};

type PainelData = Awaited<ReturnType<typeof getPainelParceiro>>;
type FinanceiroData = Awaited<ReturnType<typeof getFinanceiroParceiro>>;
type CalculadoraData = Awaited<ReturnType<typeof getPlanosCalculadoraParceiro>>;

function AreaParceiro() {
  const { como, aba, grafico, ano } = Route.useSearch();
  const anoAtual = new Date().getFullYear();
  const anoGrafico = ano && ano >= ANO_INICIAL ? ano : anoAtual;
  const anosDisponiveis = useMemo(() => {
    const fim = Math.max(ANO_INICIAL, anoAtual);
    return Array.from({ length: fim - ANO_INICIAL + 1 }, (_, i) => ANO_INICIAL + i);
  }, [anoAtual]);
  const navigate = Route.useNavigate();
  const modoAdmin = como.trim().length > 0;
  const [dados, setDados] = useState<PainelData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [planoAberto, setPlanoAberto] = useState<string | null>(null);

  const [financeiro, setFinanceiro] = useState<FinanceiroData | null>(null);
  const [carregandoFin, setCarregandoFin] = useState(false);
  const [erroFin, setErroFin] = useState<string | null>(null);
  const [fechAberto, setFechAberto] = useState<string | null>(null);
  const [calculadora, setCalculadora] = useState<CalculadoraData | null>(null);
  const [carregandoCalc, setCarregandoCalc] = useState(false);
  const [erroCalc, setErroCalc] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | "ativos" | "inativos">("todos");
  const [de, setDe] = useState(umAnoAtrasIso());
  const [ate, setAte] = useState(hojeIso());
  const [headerActionsTarget, setHeaderActionsTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderActionsTarget(document.getElementById("app-header-actions"));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    getPainelParceiro({ data: modoAdmin ? { verComoParceiroId: como.trim() } : {} })
      .then((r) => !cancelado && setDados(r))
      .catch((e) => !cancelado && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [como, modoAdmin]);

  const podeVerFechamentos = Boolean((dados as any)?.podeVerFechamentos);

  useEffect(() => {
    if (aba !== "financeiro" || !podeVerFechamentos) return;
    let cancelado = false;
    setCarregandoFin(true);
    setErroFin(null);
    getFinanceiroParceiro({ data: modoAdmin ? { verComoParceiroId: como.trim() } : {} })
      .then((r) => !cancelado && setFinanceiro(r))
      .catch((e) => !cancelado && setErroFin(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregandoFin(false));
    return () => {
      cancelado = true;
    };
  }, [aba, como, modoAdmin, podeVerFechamentos]);

  useEffect(() => {
    if (aba !== "calculadora") return;
    let cancelado = false;
    setCarregandoCalc(true);
    setErroCalc(null);
    getPlanosCalculadoraParceiro({ data: modoAdmin ? { verComoParceiroId: como.trim() } : {} })
      .then((r) => !cancelado && setCalculadora(r))
      .catch((e) => !cancelado && setErroCalc(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregandoCalc(false));
    return () => {
      cancelado = true;
    };
  }, [aba, como, modoAdmin]);

  const banner = modoAdmin ? (
    <div className="sticky top-0 z-40 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 backdrop-blur">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        <Eye className="h-4 w-4" />
        Visualizando como: {dados?.parceiro.nome ?? "…"} (modo admin, somente leitura)
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to="/gestao-parceiros">
          <X className="mr-2 h-4 w-4" /> Sair desse modo
        </Link>
      </Button>
    </div>
  ) : null;

  const veValores = Boolean(dados?.veValores);
  // Vem sempre do banco no carregamento — sem cache local, para o botão nunca ficar desatualizado.
  const podeVerPainel = Boolean((dados as any)?.podeVerPainelCliente);
  const siteUrl = ((dados?.parceiro as any)?.siteUrl as string | null) ?? null;
  const clientes = dados?.clientes ?? [];
  const movimentos = dados?.movimentos ?? [];

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (termo && !c.nome.toLowerCase().includes(termo)) return false;
      const inativo = Boolean(c.dataChurn);
      if (status === "ativos" && inativo) return false;
      if (status === "inativos" && !inativo) return false;
      return true;
    });
  }, [clientes, busca, status]);

  const noPeriodo = (data?: string | null) => Boolean(data && data >= de && data <= ate);

  const resumo = useMemo(() => {
    const base = clientesFiltrados;
    const ativos = base.filter((c) => !c.dataChurn || c.dataChurn > ate).length;
    const entradas = base.filter((c) => noPeriodo(c.dataInicio)).length;
    const saidas = base.filter((c) => noPeriodo(c.dataChurn)).length;

    const ltvs = base
      .map((c) => ltvDias(c))
      .filter((v): v is number => v !== null);

    return {
      ativos,
      entradas,
      saidas,
      ltvMedia: ltvs.length ? ltvs.reduce((s, v) => s + v, 0) / ltvs.length : 0,
      ltvMediana: mediana(ltvs),
      temLtv: ltvs.length > 0,
    };
  }, [clientesFiltrados, de, ate]);

  // Gráfico: independente do filtro De/Até — sempre janeiro a dezembro do ano escolhido.
  const serieMensal = useMemo(() => {
    const prefixo = String(anoGrafico);
    const meses = Array.from({ length: 12 }, (_, i) => {
      const chave = `${prefixo}-${String(i + 1).padStart(2, "0")}`;
      return { chave, mes: mesLabel(chave), entradas: 0, saidas: 0, ativos: 0 };
    });
    const mapa = new Map(meses.map((m) => [m.chave, m]));
    let acumulado = 0;
    for (const c of clientesFiltrados) {
      const ini = (c.dataInicio ?? "").slice(0, 7);
      const fim = (c.dataChurn ?? "").slice(0, 7);
      if (ini && ini < `${prefixo}-01`) {
        if (!fim || fim >= `${prefixo}-01`) acumulado += 1;
      }
      const kIni = mapa.get(ini);
      if (kIni) kIni.entradas += 1;
      const kFim = mapa.get(fim);
      if (kFim) kFim.saidas += 1;
    }
    for (const mes of meses) {
      acumulado += mes.entradas - mes.saidas;
      mes.ativos = Math.max(0, acumulado);
    }
    return meses;
  }, [clientesFiltrados, anoGrafico]);


  const irPara = (proxima: "clientes" | "financeiro" | "calculadora") =>
    navigate({ search: (s: any) => ({ ...s, aba: proxima }) });

  const atalhosTopo = headerActionsTarget
    ? createPortal(
      <div className="flex items-center gap-1">
        {siteUrl && (
          <Button asChild variant="ghost" size="sm" title="Site do parceiro" aria-label="Site do parceiro">
            <a
              href={siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Site</span>
            </a>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm" title="Elora App" aria-label="Elora App">
          <a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Elora App</span>
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm" title="Apresentar ferramenta" aria-label="Apresentar ferramenta">
          <a href={APRESENTACAO_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Apresentar ferramenta</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Treinamento"
          aria-label="Treinamento"
          onClick={() => toast.info("Treinamento: página em construção.")}
        >
          <GraduationCap className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Treinamento</span>
        </Button>
      </div>,
      headerActionsTarget,
    )
    : null;

  const menu = (
    <nav className="flex max-w-full items-center gap-1 overflow-x-auto" aria-label="Navegação da área do parceiro">
      <Button
        variant={aba === "clientes" ? "secondary" : "ghost"}
        size="sm"
        className="justify-start"
        onClick={() => irPara("clientes")}
      >
        <LayoutGrid className="mr-2 h-4 w-4" /> Clientes
      </Button>
      {podeVerFechamentos && (
        <Button
          variant={aba === "financeiro" ? "secondary" : "ghost"}
          size="sm"
          className="justify-start"
          onClick={() => irPara("financeiro")}
        >
          <Receipt className="mr-2 h-4 w-4" /> Financeiro
        </Button>
      )}
      <Button
        variant={aba === "calculadora" ? "secondary" : "ghost"}
        size="sm"
        className="justify-start"
        onClick={() => irPara("calculadora")}
      >
        <Calculator className="mr-2 h-4 w-4" /> Calculadora
      </Button>
    </nav>
  );

  if (carregando) {
    return (
      <div className="space-y-4">
        {banner}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-4">
        {banner}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar sua área</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {atalhosTopo}
      {banner}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dados?.parceiro.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {modoAdmin ? "Visualização administrativa somente leitura" : "Gestão da sua parceria"}
          </p>
        </div>
        {menu}
      </div>

      <div className="min-w-0 space-y-6">
          {aba === "clientes" ? (
            <>
              <Card>
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Buscar cliente</Label>
                    <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">De</Label>
                    <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Até</Label>
                    <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
                  </div>
                  <div className="flex gap-2 sm:col-span-4">
                    {(["todos", "ativos", "inativos"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={status === s ? "secondary" : "outline"}
                        onClick={() => setStatus(s)}
                      >
                        {s === "todos" ? "Todos" : s === "ativos" ? "Ativos" : "Inativos"}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Clientes ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{resumo.ativos}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" /> Entradas no período
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{resumo.entradas}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4" /> Saídas no período
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{resumo.saidas}</CardContent>
                </Card>
                {resumo.temLtv && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">LTV média</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">{Math.round(resumo.ltvMedia)} dias</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">LTV mediana</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">{Math.round(resumo.ltvMediana)} dias</CardContent>
                    </Card>
                  </>
                )}
              </div>

              {veValores && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Previsão da próxima fatura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{brl((dados as any)?.totalCarteira ?? 0)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        competência em curso, atualizada em tempo real
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Total cobrado pelo sistema
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {brl((dados as any)?.totalLicenca ?? 0)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Total de acompanhamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {brl((dados as any)?.totalAcompanhamento ?? 0)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Total de excedentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {brl((dados as any)?.totalExcedentes ?? 0)}
                    </CardContent>
                  </Card>
                </div>
              )}

              {!veValores && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Previsão da próxima fatura
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{brl((dados as any)?.totalCarteira ?? 0)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      competência em curso, atualizada em tempo real
                    </p>
                  </CardContent>
                </Card>
              )}


              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Visão do gráfico">
                    {([
                      ["fluxo", "Entradas e saídas"],
                      ["ativos", "Ativos no mês"],
                    ] as const).map(([modo, rotulo]) => (
                      <Button
                        key={modo}
                        size="sm"
                        role="tab"
                        aria-selected={grafico === modo}
                        variant={grafico === modo ? "secondary" : "ghost"}
                        onClick={() => navigate({ search: (s: any) => ({ ...s, grafico: modo }) })}
                      >
                        {rotulo}
                      </Button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <Label htmlFor="grafico-ano" className="text-xs text-muted-foreground">
                        Ano
                      </Label>
                      <Select
                        value={String(anoGrafico)}
                        onValueChange={(v) => navigate({ search: (s: any) => ({ ...s, ano: Number(v) }) })}
                      >
                        <SelectTrigger id="grafico-ano" className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {anosDisponiveis.map((a) => (
                            <SelectItem key={a} value={String(a)}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serieMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                      {grafico === "fluxo" ? (
                        <>
                          <Bar dataKey="entradas" name="Entradas" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="saidas" name="Saídas" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="ativos" name="Clientes ativos" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="saidas" name="Saídas no mês" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clientes</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Setup</TableHead>
                        <TableHead>LTV</TableHead>
                        <TableHead>Churn</TableHead>
                        {veValores && <TableHead className="text-right">Mensalidade</TableHead>}
                        <TableHead className="text-right">Ações</TableHead>
                        {podeVerPainel && <TableHead className="text-right">Painel</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesFiltrados.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7 + (veValores ? 1 : 0) + (podeVerPainel ? 1 : 0)}
                            className="text-sm text-muted-foreground"
                          >
                            Nenhum cliente encontrado com esses filtros.
                          </TableCell>
                        </TableRow>
                      )}
                      {clientesFiltrados.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>{c.plano}</TableCell>
                          <TableCell>
                            <Badge variant={c.dataChurn ? "destructive" : "secondary"}>
                              {c.dataChurn ? "Churn" : c.statusComercial === "trial" ? "Trial" : "Ativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>{dataBr(c.dataInicio)}</TableCell>
                          <TableCell>{(() => { const d = ltvDias(c); return d === null ? "—" : `${d} dias`; })()}</TableCell>
                          <TableCell>{dataBr(c.dataChurn)}</TableCell>
                          {veValores && (
                            <TableCell className="text-right">
                              {brl(((c as any).mensalidade as number) ?? 0)}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setAberto(c.id)}>
                                <History className="mr-2 h-4 w-4" /> Histórico
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={Boolean(c.dataChurn)}
                                title={c.dataChurn ? "Sem plano vigente" : undefined}
                                onClick={() => !c.dataChurn && setPlanoAberto(c.id)}
                              >
                                <PackageOpen className="mr-2 h-4 w-4" /> Plano atual
                              </Button>

                            </div>
                          </TableCell>
                          {podeVerPainel && (
                            <TableCell className="text-right">
                              <Button asChild variant="outline" size="sm">
                                <Link to="/area-do-cliente" search={{ como: c.id }}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver painel
                                </Link>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={!!aberto} onOpenChange={(open) => !open && setAberto(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      Histórico de movimentação · {clientes.find((c) => c.id === aberto)?.nome}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <ol className="space-y-2 text-sm">
                      {aberto && movimentos.filter((m) => m.clienteId === aberto).length === 0 && (
                        <li className="text-muted-foreground">Sem movimentos registrados.</li>
                      )}
                      {movimentos
                        .filter((m) => m.clienteId === aberto)
                        .map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
                            <span className="text-muted-foreground w-24">{dataBr(m.data)}</span>
                            <Badge variant="outline" className="uppercase">
                              {rotuloTipoMovimento(m.tipo)}
                            </Badge>
                            <span className="text-muted-foreground">
                              {[
                                m.plano ? `Plano: ${m.plano}` : null,
                                m.canaisWhats ? `WhatsApp: ${m.canaisWhats}` : null,
                                m.canaisInsta ? `Instagram: ${m.canaisInsta}` : null,
                                m.canaisMessenger ? `Messenger: ${m.canaisMessenger}` : null,
                                m.canaisZapi ? `Z-API: ${m.canaisZapi}` : null,
                                m.usuariosAtivos ? `Usuários: ${m.usuariosAtivos}` : null,
                                m.observacao ?? null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!planoAberto} onOpenChange={(open) => !open && setPlanoAberto(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      Plano atual do cliente · {clientes.find((c) => c.id === planoAberto)?.nome}
                    </DialogTitle>
                  </DialogHeader>
                  {(() => {
                    const cli = clientes.find((c) => c.id === planoAberto) as any;
                    if (!cli) return null;
                    const r = cli.recursos ?? {};
                    const recursos: { label: string; valor: string }[] = [
                      { label: "Canais WhatsApp", valor: `${r.canaisWhats ?? 0} (${r.canaisWhatsInclusos ?? 0} inclusos)` },
                      { label: "Canais Instagram", valor: `${r.canaisInsta ?? 0} (${r.canaisInstaInclusos ?? 0} inclusos)` },
                      { label: "Canais Messenger", valor: `${r.canaisMessenger ?? 0} (${r.canaisMessengerInclusos ?? 0} inclusos)` },
                      { label: "Canais Z-API", valor: `${r.canaisZapi ?? 0} (${r.zapiInclusos ?? 0} inclusos)` },
                      { label: "Usuários", valor: `${r.usuariosAtivos ?? 0} (${r.usuariosInclusos ?? 0} inclusos)` },
                      { label: "Contatos (MAU)", valor: `${r.contatosAtivos ?? 0} (${r.contatosInclusos ?? 0} inclusos)` },
                    ];
                    const modulos = [
                      r.agentesIA ? "Agentes de IA" : null,
                      r.asaas ? "Integração Asaas" : null,
                      r.transcricaoIA ? "Transcrição IA" : null,
                      (r.canaisZapi ?? 0) > 0 ? "Z-API" : null,
                    ].filter(Boolean) as string[];
                    const excedentes = (cli.excedentes ?? []) as any[];
                    return (
                      <div className="space-y-4">
                        <div className="rounded-md border border-border/60 p-3">
                          <p className="text-xs font-medium text-muted-foreground">Plano</p>
                          <p className="text-sm font-medium">{cli.plano}</p>
                        </div>

                        <div className="rounded-md border border-border/60 p-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Pacote atual de recursos</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {recursos.map((item) => (
                              <div key={item.label} className="flex justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="tabular-nums">{item.valor}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {modulos.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem módulos opcionais ativos.</span>
                            ) : (
                              modulos.map((m) => (
                                <Badge key={m} variant="secondary">
                                  {m}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-border/60 p-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Composição cobrada</p>
                          <ul className="space-y-1 text-sm">
                            {veValores ? (
                              ((cli.itens ?? []) as any[]).map((i, idx) => (
                                <li key={idx} className="flex justify-between gap-4">
                                  <span>{i.label}</span>
                                  <span className="tabular-nums">{brl(i.total)}</span>
                                </li>
                              ))
                            ) : (
                              <>
                                <li className="flex justify-between gap-4">
                                  <span>Plano contratado</span>
                                  <span className="tabular-nums">{brl(cli.totalPlano ?? 0)}</span>
                                </li>
                                {excedentes.map((i, idx) => (
                                  <li key={idx} className="flex justify-between gap-4">
                                    <span>{i.label}</span>
                                    <span className="tabular-nums">{brl(i.total)}</span>
                                  </li>
                                ))}
                              </>
                            )}
                            <li className="flex justify-between gap-4 border-t border-border/60 pt-1 font-medium">
                              <span>Total</span>
                              <span className="tabular-nums">{brl(cli.mensalidade ?? 0)}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>

            </>
          ) : aba === "financeiro" ? (
            <FinanceiroParceiro
              carregando={carregandoFin}
              erro={erroFin}
              dados={financeiro}
              fechAberto={fechAberto}
              setFechAberto={setFechAberto}
            />
          ) : (
            <CalculadoraParceiro
              carregando={carregandoCalc}
              erro={erroCalc}
              planos={calculadora?.planos ?? []}
            />
          )}
      </div>
    </div>
  );
}

const configuracaoInicial = (plano?: PlanoCalculadoraParceiro): ConfiguracaoCalculadoraParceiro => ({
  usuarios: plano?.usuariosInclusos ?? 1,
  canaisWhatsTotal: plano?.canaisWhatsInclusos ?? 0,
  // API Oficial sempre começa em 0 — nunca herda valor anterior nem a franquia.
  canaisWhatsOficiais: 0,
  canaisInsta: plano?.canaisInstaInclusos ?? 0,
  canaisMessenger: plano?.canaisMessengerInclusos ?? 0,
  agentesIA: Boolean(plano?.incluiIA),
  asaas: Boolean(plano?.incluiAsaas),
  transcricaoIA: Boolean(plano?.incluiTranscricao),
  setup: 0,
});

function CalculadoraParceiro({
  carregando,
  erro,
  planos,
}: {
  carregando: boolean;
  erro: string | null;
  planos: PlanoCalculadoraParceiro[];
}) {
  const [planoId, setPlanoId] = useState("");
  const plano = planos.find((p) => p.id === planoId) ?? planos[0];
  const [config, setConfig] = useState<ConfiguracaoCalculadoraParceiro>(() => configuracaoInicial());
  const [margem, setMargem] = useState<MargemParceiro>({
    tipo: "fixa",
    valor: 0,
    base: "mensalidade",
  });

  useEffect(() => {
    if (!plano) return;
    setPlanoId(plano.id);
    setConfig(configuracaoInicial(plano));
  }, [plano?.id]);

  if (carregando) return <Skeleton className="h-96 w-full" />;
  if (erro) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar a calculadora</AlertTitle>
        <AlertDescription>{erro}</AlertDescription>
      </Alert>
    );
  }
  if (!plano) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum plano está vinculado a este parceiro.
        </CardContent>
      </Card>
    );
  }

  const resultado = calcularOrcamentoParceiro(plano, config);
  const zapiNaoOficiais = canaisZapiDerivados(config);
  // Mensalidade base = licença do plano + acompanhamento padrão, sem discriminar.
  const mensalidadeBase = (resultado.itens[0]?.total ?? 0) + resultado.acompanhamento;
  const excedentes = resultado.itens.slice(1).reduce((s, i) => s + i.total, 0);
  const custoBase = mensalidadeBase + excedentes;
  // Setup digitado pelo parceiro entra na base da margem só em "mensalidade + setup".
  const valorMargem = calcularMargemParceiro(margem, custoBase, config.setup);
  const totalCobrar = custoBase + valorMargem;
  const [licencaAberta, setLicencaAberta] = useState(false);

  const alterarNumero = (campo: keyof ConfiguracaoCalculadoraParceiro, valor: string) => {
    const numero = Math.max(0, Number(valor) || 0);
    setConfig((atual) => {
      const proximo = { ...atual, [campo]: numero };
      if (campo === "canaisWhatsTotal") {
        proximo.canaisWhatsOficiais = Math.min(atual.canaisWhatsOficiais, numero);
      }
      if (campo === "canaisWhatsOficiais") {
        proximo.canaisWhatsOficiais = Math.min(numero, atual.canaisWhatsTotal);
      }
      return proximo;
    });
  };

  const camposQuantidade: { campo: keyof ConfiguracaoCalculadoraParceiro; label: string }[] = [
    { campo: "usuarios", label: "Usuários" },
    { campo: "canaisInsta", label: "Canais Instagram" },
    { campo: "canaisMessenger", label: "Canais Messenger" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>Calculadora de proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select
              value={plano.id}
              onValueChange={(id) => {
                const escolhido = planos.find((p) => p.id === id);
                if (!escolhido) return;
                setPlanoId(escolhido.id);
                setConfig(configuracaoInicial(escolhido));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-3 text-sm font-medium">WhatsApp</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calc-whats-total">Quantos números vamos conectar?</Label>
                <Input
                  id="calc-whats-total"
                  type="number"
                  min="0"
                  step="1"
                  value={String(config.canaisWhatsTotal)}
                  onChange={(e) => alterarNumero("canaisWhatsTotal", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-whats-oficiais">Quantos desses são API Oficial?</Label>
                <Input
                  id="calc-whats-oficiais"
                  type="number"
                  min="0"
                  max={String(config.canaisWhatsTotal)}
                  step="1"
                  value={String(config.canaisWhatsOficiais)}
                  onChange={(e) => alterarNumero("canaisWhatsOficiais", e.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {zapiNaoOficiais} número(s) via Z-API{" "}
              {zapiNaoOficiais > 0 ? `· ${brl(plano.valorZapi)} por número não oficial` : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {camposQuantidade.map(({ campo, label }) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={`calc-${campo}`}>{label}</Label>
                <Input
                  id={`calc-${campo}`}
                  type="number"
                  min="0"
                  step="1"
                  value={String(config[campo])}
                  onChange={(e) => alterarNumero(campo, e.target.value)}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="calc-setup">Setup (R$) · opcional</Label>
              <Input
                id="calc-setup"
                type="number"
                min="0"
                step="0.01"
                value={String(config.setup)}
                onChange={(e) => alterarNumero("setup", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["agentesIA", "Agentes de IA"],
              ["asaas", "Integração Asaas"],
              ["transcricaoIA", `Transcrição IA — ${brl(plano.valorTranscricaoUser)}/usuário`],
            ] as const).map(([campo, label]) => (
              <label key={campo} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <span>{label}</span>
                <Switch
                  checked={config[campo]}
                  onCheckedChange={(checked) => setConfig((atual) => ({ ...atual, [campo]: checked }))}
                />
              </label>
            ))}
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-3 text-sm font-medium">Sua margem</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={margem.tipo}
                  onValueChange={(v) => setMargem((m) => ({ ...m, tipo: v as MargemParceiro["tipo"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Valor fixo (R$)</SelectItem>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-margem-valor">
                  {margem.tipo === "percentual" ? "Percentual" : "Valor"}
                </Label>
                <Input
                  id="calc-margem-valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(margem.valor)}
                  onChange={(e) =>
                    setMargem((m) => ({ ...m, valor: Math.max(0, Number(e.target.value) || 0) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Aplicar sobre</Label>
                <Select
                  value={margem.base}
                  onValueChange={(v) => setMargem((m) => ({ ...m, base: v as MargemParceiro["base"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalidade">Só mensalidade</SelectItem>
                    <SelectItem value="mensalidade_setup">Mensalidade + setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-base">Resumo da proposta</CardTitle>
          <p className="text-sm text-muted-foreground">{plano.nome}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Setup</p>
              <p className="mt-1 font-semibold tabular-nums">{brl(plano.valorSetup)}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Mensalidade base</p>
              <p className="mt-1 font-semibold tabular-nums">{brl(mensalidadeBase)}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {resultado.itens.slice(1).map((item, indice) => (
              <div key={`${item.label}-${indice}`} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
                <div>
                  <p>{item.label}</p>
                  {item.incluso && <p className="text-xs text-muted-foreground">{item.incluso}</p>}
                  {item.qtd > 1 && <p className="text-xs text-muted-foreground">{item.qtd} × {brl(item.unit)}</p>}
                </div>
                <span className="shrink-0 tabular-nums">{brl(item.total)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
              <span>Excedentes</span>
              <span className="tabular-nums">{brl(excedentes)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
              <span>Margem aplicada</span>
              <span className="tabular-nums">{brl(valorMargem)}</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
            <span className="font-medium">Total a cobrar do cliente</span>
            <span className="text-2xl font-semibold tabular-nums">{brl(totalCobrar)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function FinanceiroParceiro({
  carregando,
  erro,
  dados,
  fechAberto,
  setFechAberto,
}: {
  carregando: boolean;
  erro: string | null;
  dados: FinanceiroData | null;
  fechAberto: string | null;
  setFechAberto: (v: string | null) => void;
}) {
  if (carregando) return <Skeleton className="h-64 w-full" />;
  if (erro) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar o financeiro</AlertTitle>
        <AlertDescription>{erro}</AlertDescription>
      </Alert>
    );
  }

  const fechamentos = dados?.fechamentos ?? [];
  if (!dados?.habilitado || fechamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum fechamento disponível para consulta no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {fechamentos.map((f) => {
        const expandido = fechAberto === f.id;
        return (
          <Card key={f.id}>
            <CardHeader
              className="cursor-pointer flex-row items-center gap-2 space-y-0"
              onClick={() => setFechAberto(expandido ? null : f.id)}
            >
              {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <CardTitle className="text-base">{f.titulo}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{f.competencia}</Badge>
              <span className="ml-auto text-sm font-semibold">{brl(f.totalLiquido)}</span>
            </CardHeader>
            {expandido && (
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Composição cobrada</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.linhas.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          {l.clienteNome}
                          {l.planoNome && (
                            <span className="block text-xs text-muted-foreground">{l.planoNome}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.composicao.length === 0
                            ? "—"
                            : l.composicao.map((c) => `${c.label}: ${brl(c.total)}`).join(" · ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.cicloInicio && l.cicloFim
                            ? `${dataBr(l.cicloInicio)} → ${dataBr(l.cicloFim)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{brl(l.valorBruto)}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(l.valorDesconto)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{brl(l.valorLiquido)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">Total da sua carteira</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(f.totalBruto)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(f.totalDesconto)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{brl(f.totalLiquido)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
