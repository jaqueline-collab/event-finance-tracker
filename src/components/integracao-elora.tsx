import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  alternarIntegracaoCliente,
  getIntegracaoCliente,
  salvarIntegracaoCliente,
  sincronizarIntegracaoCliente,
  testarIntegracaoCliente,
} from "@/lib/integracao-elora.functions";

type Estado = Awaited<ReturnType<typeof getIntegracaoCliente>>;

const dataHoraBr = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Aba interna de conexão com o app Elora (uma chave de API por cliente). */
export function IntegracaoElora({ clienteId }: { clienteId: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

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

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await sincronizarIntegracaoCliente({ data: { clienteId } });
      toast.success("Uso e resultados atualizados a partir do app Elora.");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSincronizando(false);
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
              placeholder="https://conta.app.eloracrm.com.br"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
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
          <Button size="sm" variant="outline" onClick={sincronizar} disabled={!estado.configurada || !estado.ativo || sincronizando}>
            <RefreshCw className="mr-2 h-4 w-4" /> {sincronizando ? "Sincronizando…" : "Sincronizar agora"}
          </Button>
          {estado.configurada && (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={estado.ativo} onCheckedChange={alternar} />
              Ligada
            </label>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {estado.ultimaSync
            ? `Última sincronização: ${dataHoraBr(estado.ultimaSync)}.`
            : "Ainda não houve sincronização."}
          {estado.ultimoErro ? ` Último erro: ${estado.ultimoErro}` : ""}
          {" "}A chave nunca é exibida — apenas substituída.
        </p>
      </CardContent>
    </Card>
  );
}
