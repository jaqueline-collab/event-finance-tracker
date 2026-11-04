import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, RefreshCw, Settings2, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  alternarIntegracaoCliente,
  getIntegracaoCliente,
  salvarIntegracaoCliente,
  sincronizarIntegracaoCliente,
  testarIntegracaoCliente,
} from "@/lib/integracao-elora.functions";
import { sincronizarAgoraCliente } from "@/lib/elora-espelho.functions";

const NOME_FONTE: Record<string, string> = { apoio: "listas da conta", contatos: "contatos", atendimentos: "atendimentos", mensagens: "mensagens" };

type Estado = Awaited<ReturnType<typeof getIntegracaoCliente>>;

const dataHoraBr = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Aba interna de conexão com o app Elora (uma chave de API por cliente). */
export function IntegracaoElora({ clienteId, semAtalho = false }: { clienteId: string; semAtalho?: boolean }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    setCarregando(true);
    getIntegracaoCliente({ data: { clienteId } })
      .then((r) => {
        setEstado(r);
        setBaseUrl(r.baseUrl ?? "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, [clienteId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (carregando || !estado) return <Skeleton className="h-32 w-full" />;

  const mapeado = Boolean(estado.campoProcedimentoKey && estado.campoDataConsultaKey);

  const salvar = async () => {
    if (!baseUrl.trim() || !apiKey.trim()) {
      toast.error("Informe o endereço da conta e a chave de API.");
      return;
    }
    setSalvando(true);
    try {
      await salvarIntegracaoCliente({
        data: { clienteId, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() },
      });
      toast.success("Integração salva. A chave fica guardada no servidor e não aparece aqui.");
      setApiKey("");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (ativo: boolean) => {
    try {
      await alternarIntegracaoCliente({ data: { clienteId, ativo } });
      toast.success(ativo ? "Integração ligada." : "Integração desligada.");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const testar = async () => {
    setTestando(true);
    try {
      const r = await testarIntegracaoCliente({ data: { clienteId } });
      if (r.conectado) toast.success(r.mensagem);
      else toast.error(r.mensagem);
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTestando(false);
    }
  };

  const sincronizarAntiga = async () => {
    const r = await sincronizarIntegracaoCliente({ data: { clienteId } });
    toast.success(
      r.retomado
        ? `Sincronização retomada e concluída. ${r.contatos} contatos processados.`
        : `Sincronização concluída. ${r.contatos} contatos processados.`,
    );
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      let fonte: "apoio" | "contatos" | "atendimentos" | "mensagens" | null = "apoio";
      const total: Record<string, number> = {};
      while (fonte) {
        setProgresso(`Sincronizando ${NOME_FONTE[fonte]}…`);
        const r = await sincronizarAgoraCliente({ data: { clienteId, fonte } });
        if (r.leituraAntiga) {
          await sincronizarAntiga();
          break;
        }
        total[r.fonte] = r.registros;
        if (r.concluido) setProgresso(`${NOME_FONTE[r.fonte]}: ${r.registros.toLocaleString("pt-BR")} atualizados`);
        fonte = r.proxima;
        if (!fonte) {
          toast.success(
            "Sincronização concluída. " +
              Object.entries(total).map(([k, v]) => `${NOME_FONTE[k]}: ${v.toLocaleString("pt-BR")}`).join(" · "),
          );
        }
      }
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSincronizando(false);
      setProgresso(null);
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Plug className="h-4 w-4" /> Integração Elora (app)
          </h3>
          {estado.configurada ? (
            <Badge variant={estado.ativo ? "secondary" : "outline"}>
              {estado.ativo ? `Conectada · ${estado.chaveMascarada}` : "Configurada, desligada"}
            </Badge>
          ) : (
            <Badge variant="outline">Não configurada</Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`int-url-${clienteId}`}>Endereço da conta</Label>
            <Input
              id={`int-url-${clienteId}`}
              placeholder="https://api.wts.chat"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Só o domínio da API, sem caminho (sem /core, /crm ou /chat no final) — o sistema
              completa sozinho para cada parte da conta.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`int-key-${clienteId}`}>Chave de API da conta</Label>
            <Input
              id={`int-key-${clienteId}`}
              type="password"
              autoComplete="off"
              placeholder={estado.configurada ? "Informe para substituir" : "Cole a chave aqui"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar integração"}
          </Button>
          <Button size="sm" variant="outline" onClick={testar} disabled={!estado.configurada || testando}>
            <Zap className="mr-2 h-4 w-4" /> {testando ? "Testando…" : "Testar conexão"}
          </Button>
          {estado.configurada && (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={estado.ativo} onCheckedChange={alternar} />
              Ligada
            </label>
          )}
        </div>

        <div className={semAtalho ? "hidden" : "flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-4"}>
          <div className="min-w-0">
            <p className="text-sm font-medium">Mapeamento e filtros</p>
            <p className="text-xs text-muted-foreground">
              Campos personalizados, painéis, sequências, classificações e filtros da conta.
            </p>
          </div>
          {!semAtalho && (
          <Button size="sm" variant="outline" className="ml-auto" asChild>
            <Link to="/area-do-cliente" search={{ como: clienteId, configurar: "painel" } as never}>
              <Settings2 className="mr-2 h-4 w-4" /> Configurar na Área do cliente
            </Link>
          </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={sincronizar}
            disabled={!estado.configurada || !estado.ativo || sincronizando}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando…" : "Sincronizar agora"}
          </Button>
          {progresso && <p className="text-xs text-muted-foreground">{progresso}</p>}
          {!mapeado && (
            <p className="text-xs text-muted-foreground">Configure o mapeamento de campos primeiro.</p>
          )}
        </div>

        {estado.retomadaPendente && (
          <p className="text-xs text-muted-foreground">
            A sincronização anterior não terminou. O próximo clique retoma de onde parou, sem duplicar contatos.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {estado.ultimaSync
            ? `Última sincronização concluída: ${dataHoraBr(estado.ultimaSync)}.`
            : "Ainda não houve sincronização concluída."}
          {estado.ultimoErro ? ` Último erro: ${estado.ultimoErro}` : ""}
          {" "}A chave nunca é exibida — apenas substituída.
        </p>
      </CardContent>
    </Card>
  );
}
