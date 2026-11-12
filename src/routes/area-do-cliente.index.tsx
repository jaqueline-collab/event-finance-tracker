import { BookOpen } from "lucide-react";
import { ELORA_APP_URL, ELORA_GUIA_URL } from "@/lib/links-globais";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { useDefinirMenuArea } from "@/components/area-externa-layout";
import { mostrarEsqueletoArea } from "@/lib/area-externa";

import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Users,
  LayoutDashboard,
  GraduationCap,
  Wallet,
  Pencil,
  Cable,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PainelTreinamento } from "@/components/treinamento/painel-treinamento";
import {
  adicionarPessoaEquipe,
  getPainelCliente,
  removerPessoaEquipe,
} from "@/lib/cliente.functions";
import { ResultadosCliente } from "@/components/resultados-cliente";
import { VisoesPainel, type EstadoVisoes, type VisoesPainelHandle } from "@/components/visoes-painel";
import { SecaoRelatorioDiario } from "@/components/resultados-cliente";
import { abaAreaCliente } from "@/lib/area-cliente-menu";
import { ConfigurarApiCliente } from "@/components/configurar-api-cliente";
import { usePerfil } from "@/hooks/use-perfil";
import { useCurrentUserAccess } from "@/lib/permissions";
import { abaConfigurarDoEndereco, podeConfigurarArea, type AbaDadosElora } from "@/lib/dados-elora";
import { ConfiguracaoClienteSheet } from "@/components/configuracao-cliente-sheet";
import { PainelVisual, SeletorPeriodo } from "@/components/painel-visual";
import { MatrizCliente } from "@/components/matriz-cliente";
import { salvarFiltrosPadraoVisao } from "@/lib/dashboard-visoes.functions";
import type { FiltroCampo } from "@/lib/campos-elora";
import { periodoDe, type Periodo, type PeriodoChave } from "@/lib/painel-visual";


export const Route = createFileRoute("/area-do-cliente/")({
  head: () => ({
    meta: [
      { title: "Minha conta e painel · EloraCRM" },
      { name: "description", content: "Painel, limites contratados, equipe e histórico da sua conta EloraCRM." },
      { property: "og:title", content: "Minha conta e painel · EloraCRM" },
      { property: "og:description", content: "Acompanhe seu painel, plano contratado e equipe no EloraCRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaCliente,
});

type Painel = Awaited<ReturnType<typeof getPainelCliente>>;

const dataBr = (v?: string | null) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const APP_URL = ELORA_APP_URL;

function AreaCliente() {
  const { como, aba: abaBruta, configurar } = Route.useSearch();
  const aba = abaAreaCliente(abaBruta);
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUserAccess();
  const modoConfig = podeConfigurarArea({ isAdmin, como });
  const abaConfig = modoConfig ? abaConfigurarDoEndereco(configurar) : null;
  const setConfigurar = (v: AbaDadosElora | "") =>
    navigate({ to: "/area-do-cliente", search: (s: any) => ({ ...s, configurar: v }) as never, replace: true });
  const perfilLogado = usePerfil();
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const setAba = (v: string) =>
    navigate({ to: "/area-do-cliente", search: (s: any) => ({ ...s, aba: v }) as never });
  const visoesRef = useRef<VisoesPainelHandle>(null);
  const [estadoVisoes, setEstadoVisoes] = useState<EstadoVisoes | null>(null);
  const aoEstadoVisoes = useCallback((e: EstadoVisoes) => setEstadoVisoes(e), []);
  const [novoGrafico, setNovoGrafico] = useState(0);
  const [periodoChave, setPeriodoChave] = useState<PeriodoChave>("30d");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDe("30d", new Date().toISOString()));
  const [painelVisual, setPainelVisual] = useState<boolean | null>(null);
  const jaCarregou = useRef(false);
  if (!carregando && (dados || erro)) jaCarregou.current = true;

  useDefinirMenuArea([
    {
      label: "Minha conta",
      itens: [
        { key: "conta", label: "Painel", icon: LayoutDashboard, ativo: aba === "conta", onSelect: () => setAba("conta") },
        { key: "plano", label: "Conta", icon: Wallet, ativo: aba === "plano", onSelect: () => setAba("plano") },
        { key: "equipe", label: "Minha equipe", icon: Users, ativo: aba === "equipe", onSelect: () => setAba("equipe") },
        { key: "treinamento", label: "Treinamento", icon: GraduationCap, ativo: aba === "treinamento", onSelect: () => setAba("treinamento") },
        { key: "novidades", label: "Novidades", icon: Sparkles, ativo: aba === "novidades", onSelect: () => setAba("novidades") },
      ],
    },
    {
      label: "Links",
      itens: [{ key: "app", label: "Acessar o aplicativo", icon: ArrowUpRight, href: APP_URL },
        { key: "guia", label: "Guia da ferramenta", icon: BookOpen, href: ELORA_GUIA_URL },
      ],
    },
  ]);


  const carregar = () => {
    // Recargas (após adicionar/remover pessoa) acontecem em segundo plano.
    if (!jaCarregou.current) setCarregando(true);
    setErro(null);
    getPainelCliente({ data: como.trim() ? { verComoClienteId: como.trim() } : {} })
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    jaCarregou.current = false;
    carregar();
  }, [como]);

  const modoVisualizacao = Boolean(como.trim());

  const adicionar = async () => {
    if (modoVisualizacao) {
      toast.error("Modo de visualização: alterações estão desativadas.");
      return;
    }
    if (nome.trim().length < 2 || !email.includes("@")) {
      toast.error("Informe nome e um e-mail válido.");
      return;
    }
    setSalvando(true);
    try {
      await adicionarPessoaEquipe({ data: { nome: nome.trim(), email: email.trim() } });
      toast.success("Pessoa adicionada. Ela entra com esse e-mail.");
      setNome("");
      setEmail("");
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    if (modoVisualizacao) {
      toast.error("Modo de visualização: alterações estão desativadas.");
      return;
    }
    try {
      await removerPessoaEquipe({ data: { id } });
      toast.success("Acesso removido.");
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover.");
    }
  };

  if (mostrarEsqueletoArea(jaCarregou.current)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar sua área</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{erro ?? "Conta não encontrada."}</p>
          <Button size="sm" variant="outline" onClick={carregar}>Tentar de novo</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (dados.semVinculo) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Este login não é de um cliente</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Sua conta não está vinculada a nenhuma empresa cliente. Para conferir esta tela, entre no
            seu perfil e use a opção “Ir para a Área do Cliente” escolhendo a empresa.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/perfil" })}>
            Ir para o meu perfil
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const d = dados as Required<Painel>;
  const { cliente, plano, contratado, recursos, historico, equipe } = d;
  const primeiroNome = (perfilLogado.nome?.trim().split(/\s+/)[0]
    ?? perfilLogado.email?.split("@")[0]
    ?? "").trim();


  return (
    <div className="space-y-6">
      {modoVisualizacao && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
          <span className="text-muted-foreground">
            Visualizando: <span className="font-medium text-foreground">{cliente.nome}</span>
          </span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate({ to: "/dashboard" })}>
            <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
          </Button>
          {modoConfig && aba === "conta" && estadoVisoes?.podeEditar && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {!estadoVisoes.editando ? (
                <Button size="sm" variant="outline" className="h-7" onClick={() => void visoesRef.current?.entrar()}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setConfigurar("conexao")}>
                    <Cable className="mr-1 h-3.5 w-3.5" /> Conexão e canais
                  </Button>
                  {estadoVisoes.aceitaGraficos && painelVisual === false && (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNovoGrafico((n) => n + 1)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Gráfico
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7" disabled={estadoVisoes.salvando} onClick={() => void visoesRef.current?.cancelar()}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="h-7" disabled={estadoVisoes.salvando} onClick={() => void visoesRef.current?.salvar()}>
                    {estadoVisoes.salvando ? "Salvando…" : "Salvar"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {modoConfig && (
        <ConfiguracaoClienteSheet
          clienteId={cliente.id}
          nomeCliente={cliente.nome}
          aba={abaConfig}
          onAba={setConfigurar}
          onFechar={() => setConfigurar("")}
        />
      )}
      {aba === "conta" && painelVisual ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{cliente.nome}</p>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {estadoVisoes?.nomeAtiva ?? "Resultados"}
            </h1>
          </div>
          {estadoVisoes?.nomeAtiva !== "Relatório diário" && !estadoVisoes?.editando && !estadoVisoes?.graficosAtiva && (
            <SeletorPeriodo chave={periodoChave} periodo={periodo} onMudar={(c, p) => { setPeriodoChave(c); setPeriodo(p); }} />
          )}
        </div>
      ) : (
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-2">{cliente.status === "trial" ? "Trial" : "Conta ativa"}</Badge>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {cliente.nome}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Ativação: {dataBr(cliente.dataInicio)}
              </span>
              {plano && (
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4" /> Plano {plano.nome}
                </span>
              )}
            </p>
          </div>
          {primeiroNome && (
            <p className="self-center text-lg font-semibold text-foreground sm:text-xl">
              Olá, {primeiroNome}
            </p>
          )}
        </div>
      </div>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsContent value="treinamento" className="mt-4">
          <PainelTreinamento audiencia="cliente" />
        </TabsContent>

        <TabsContent value="conta" className="mt-0 grid gap-4 md:grid-cols-2">
          <div className="min-w-0 md:col-span-2">
              <VisoesPainel
                ref={visoesRef}
                clienteId={cliente.id}
                onEstado={aoEstadoVisoes}
                relatorio={<SecaoRelatorioDiario clienteId={cliente.id} />}
                matriz={painelVisual ? (editando) => <MatrizCliente clienteId={cliente.id} periodo={periodo} editando={editando} /> : undefined}
                editorGraficos={
                  modoConfig && painelVisual === false
                    ? (visaoId, aoMudar) => (
                        <ConfigurarApiCliente clienteId={cliente.id} aba="painel" soGraficos visaoId={visaoId} aoMudarGraficos={aoMudar} novoGraficoChave={novoGrafico} />
                      )
                    : undefined
                }
              >
                {(visaoId, chave, ctx) =>
                  // Clientes com espelho: visão com gráficos antigos mostra só eles;
                  // as demais mostram só o painel novo (um único seletor de período).
                  painelVisual && ctx.totalGraficos > 0 ? (
                    <ResultadosCliente clienteId={cliente.id} visaoId={visaoId} recarregarChave={chave} />
                  ) : (
                    <div className="space-y-5">
                      <PainelComFiltros
                        key={visaoId ?? "padrao"}
                        visaoId={visaoId}
                        padrao={ctx.filtrosPadrao}
                        podeSalvarPadrao={ctx.podeEditar && ctx.editando}
                        clienteId={cliente.id}
                        periodo={periodo}
                        onDisponivel={setPainelVisual}
                        editando={ctx.editando}
                        ocultos={ctx.ocultos}
                        onAlternarOculto={ctx.alternarOculto}
                      />
                      {painelVisual === false && <ResultadosCliente clienteId={cliente.id} visaoId={visaoId} recarregarChave={chave} />}
                    </div>
                  )
                }
              </VisoesPainel>
          </div>
        </TabsContent>

        <TabsContent value="plano" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">O que está na sua conta</CardTitle>
              <CardDescription>Quantidades disponíveis hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {contratado.map((i) => (
                <div key={i.label} className="flex items-center justify-between border-b border-border/40 pb-1.5 text-sm">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-semibold">{i.valor}</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                {recursos.agentesIa && <Badge variant="secondary">Agentes de IA</Badge>}
                {recursos.asaas && <Badge variant="secondary">Asaas</Badge>}
                {recursos.zapi && <Badge variant="secondary">Z-API</Badge>}
                {recursos.transcricao && <Badge variant="secondary">Transcrição</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seu plano</CardTitle>
              <CardDescription>{plano ? plano.nome : "Sem plano vinculado"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {plano?.inclusos.map((i) => (
                <div key={i.label} className="flex items-center justify-between border-b border-border/40 pb-1.5 text-sm">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-semibold">{i.valor}</span>
                </div>
              ))}
              {!plano && <p className="text-sm text-muted-foreground">Fale com o time para vincular um plano.</p>}
            </CardContent>
          </Card>
                  <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mudanças na conta</CardTitle>
              <CardDescription>Upgrades, downgrades e ajustes ao longo do tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              {historico.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mudança registrada até agora.</p>
              )}
              <ol className="relative space-y-4 border-l border-border/60 pl-5">
                {historico.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{dataBr(h.data)}</span>
                      <Badge variant="outline" className="capitalize">{h.tipo}</Badge>
                    </div>
                    {h.itens.length > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">{h.itens.join(" · ")}</p>
                    )}
                    {h.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{h.observacao}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
                  </div>
                </div>
        </TabsContent>

        <TabsContent value="equipe" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Pessoas com acesso
              </CardTitle>
              <CardDescription>Quem você liberar aqui entra com o próprio e-mail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="eq-nome">Nome</Label>
                  <Input id="eq-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eq-email">E-mail</Label>
                  <Input id="eq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
                </div>
                <Button onClick={() => void adicionar()} disabled={salvando}>
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2">Adicionar</span>
                </Button>
              </div>
              <div className="divide-y divide-border/50">
                {equipe.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.vinculado ? "secondary" : "outline"}>
                        {p.vinculado ? "Ativo" : "Aguardando 1º acesso"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => void remover(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {equipe.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">Ninguém liberado ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="novidades" className="mt-4 space-y-3">
          {d.releases.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma novidade publicada para a sua conta ainda.
              </CardContent>
            </Card>
          )}
          {d.releases.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{r.titulo}</CardTitle>
                  <Badge variant="secondary" className="capitalize">{r.tag}</Badge>
                  <span className="text-xs text-muted-foreground">{dataBr(r.publicadoEm)}</span>
                </div>
                {r.resumo && <CardDescription>{r.resumo}</CardDescription>}
              </CardHeader>
              {r.conteudo && (
                <CardContent>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{r.conteudo}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

              </Tabs>
    </div>
  );
}

/** Painel de uma visão: começa com os filtros padrão dela; o cliente aplica os seus sem salvar. */
function PainelComFiltros({
  visaoId,
  padrao,
  podeSalvarPadrao,
  ...rest
}: Omit<ComponentProps<typeof PainelVisual>, "filtros" | "onFiltros"> & { visaoId: string | null; padrao: FiltroCampo[]; podeSalvarPadrao: boolean }) {
  const [filtros, setFiltros] = useState<FiltroCampo[]>(padrao);
  const [salvando, setSalvando] = useState(false);
  const iguais = JSON.stringify(filtros) === JSON.stringify(padrao);
  return (
    <div className="space-y-2">
      {podeSalvarPadrao && visaoId && !iguais && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground">Os filtros desta visão mudaram.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={salvando}
            onClick={async () => {
              setSalvando(true);
              try {
                await salvarFiltrosPadraoVisao({ data: { clienteId: rest.clienteId, visaoId, filtros } });
                toast.success("Filtros padrão da visão salvos.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : String(e));
              } finally {
                setSalvando(false);
              }
            }}
          >
            Salvar como padrão da visão
          </Button>
        </div>
      )}
      <PainelVisual {...rest} filtros={filtros} onFiltros={setFiltros} />
    </div>
  );
}
