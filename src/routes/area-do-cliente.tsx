import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adicionarPessoaEquipe,
  getPainelCliente,
  removerPessoaEquipe,
} from "@/lib/cliente.functions";

const searchSchema = z.object({ como: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/area-do-cliente")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Área do Cliente · Elora" },
      { name: "description", content: "Veja seu plano, o que está contratado, o histórico da conta e as novidades do Elora." },
      { property: "og:title", content: "Área do Cliente · Elora" },
      { property: "og:description", content: "Plano, serviços contratados, histórico e novidades da sua conta Elora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaCliente,
});

type Painel = Awaited<ReturnType<typeof getPainelCliente>>;

const dataBr = (v?: string | null) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const APP_URL = "https://app.eloracrm.com.br/";

function AreaCliente() {
  const { como } = Route.useSearch();
  const navigate = useNavigate();
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    setErro(null);
    getPainelCliente({ data: como.trim() ? { verComoClienteId: como.trim() } : {} })
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [como]);

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

  if (carregando) {
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
        <AlertDescription>{erro ?? "Conta não encontrada."}</AlertDescription>
      </Alert>
    );
  }

  const { cliente, plano, contratado, recursos, historico, equipe } = dados;

  return (
    <div className="space-y-6">
      {modoVisualizacao && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Visualizando como <span className="font-semibold">{cliente.nome}</span> — modo administrador,
            somente leitura.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/perfil" })}>
            Sair da visualização
          </Button>
        </div>
      )}
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
          <Button asChild>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer">
              Acessar o aplicativo <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conta">
        <TabsList className="flex-wrap">
          <TabsTrigger value="conta">Minha conta</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="novidades">Novidades</TabsTrigger>
          <TabsTrigger value="equipe">Minha equipe</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="conta" className="mt-4 grid gap-4 md:grid-cols-2">
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
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
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
        </TabsContent>

        <TabsContent value="novidades" className="mt-4 space-y-3">
          {dados.releases.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma novidade publicada para a sua conta ainda.
              </CardContent>
            </Card>
          )}
          {dados.releases.map((r) => (
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

        <TabsContent value="equipe" className="mt-4">
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

        <TabsContent value="resultados" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" /> Resultados da conta
              </CardTitle>
              <CardDescription>Indicadores de atendimento e vendas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Atendimentos", "Tempo de 1ª resposta", "Conversões"].map((t) => (
                  <div key={t} className="rounded-lg border border-dashed border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t}</p>
                    <p className="mt-1 text-2xl font-bold text-muted-foreground/50">—</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Em breve: estes números virão direto da sua operação no aplicativo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
