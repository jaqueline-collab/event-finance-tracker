import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plug, RefreshCw, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  alternarIntegracaoCliente,
  getIntegracaoCliente,
  listarCamposPersonalizados,
  salvarIntegracaoCliente,
  salvarMapeamentoCliente,
  sincronizarIntegracaoCliente,
  testarIntegracaoCliente,
  type CampoElora,
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
  const [campos, setCampos] = useState<CampoElora[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [campoProc, setCampoProc] = useState("");
  const [campoData, setCampoData] = useState("");
  const [salvandoMap, setSalvandoMap] = useState(false);

  const recarregar = useCallback(() => {
    setCarregando(true);
    getIntegracaoCliente({ data: { clienteId } })
      .then((r) => {
        setEstado(r);
        setBaseUrl(r.baseUrl ?? "");
        setCampoProc(r.campoProcedimentoKey ?? "");
        setCampoData(r.campoDataConsultaKey ?? "");
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

  const buscarCampos = async () => {
    setBuscando(true);
    try {
      const r = await listarCamposPersonalizados({ data: { clienteId } });
      setCampos(r.campos);
      if (r.campos.length === 0) {
        toast.error("Nenhum campo personalizado encontrado nessa conta.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBuscando(false);
    }
  };

  const salvarMapeamento = async () => {
    if (!campoProc || !campoData) {
      toast.error("Escolha os dois campos antes de salvar.");
      return;
    }
    setSalvandoMap(true);
    try {
      await salvarMapeamentoCliente({
        data: { clienteId, campoProcedimentoKey: campoProc, campoDataConsultaKey: campoData },
      });
      toast.success("Mapeamento salvo. A sincronização já pode rodar.");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvandoMap(false);
    }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarIntegracaoCliente({ data: { clienteId } });
      toast.success(
        r.retomado
          ? `Sincronização retomada e concluída. ${r.contatos} contatos processados.`
          : `Sincronização concluída. ${r.contatos} contatos processados.`,
      );
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
          {estado.configurada && (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={estado.ativo} onCheckedChange={alternar} />
              Ligada
            </label>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Mapeamento de campos personalizados</p>
              <p className="text-xs text-muted-foreground">
                Diz onde encontrar o procedimento de interesse e a data da consulta nos contatos da conta.
              </p>
            </div>
            {mapeado && <Badge variant="secondary">Mapeamento salvo</Badge>}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={buscarCampos}
            disabled={!estado.configurada || !estado.ativo || buscando}
          >
            <Search className="mr-2 h-4 w-4" />
            {buscando ? "Buscando…" : "Buscar campos personalizados da conta"}
          </Button>

          {campos !== null && campos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum campo personalizado encontrado na conta.</p>
          )}

          {campos !== null && campos.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Qual campo é Procedimento de interesse?</Label>
                  <Select value={campoProc || undefined} onValueChange={setCampoProc}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {campos.map((c) => (
                        <SelectItem key={c.chave} value={c.chave}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Qual campo é Data da consulta?</Label>
                  <Select value={campoData || undefined} onValueChange={setCampoData}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {campos.map((c) => (
                        <SelectItem key={c.chave} value={c.chave}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={salvarMapeamento} disabled={salvandoMap || !campoProc || !campoData}>
                {salvandoMap ? "Salvando…" : "Salvar mapeamento"}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={sincronizar}
            disabled={!estado.configurada || !estado.ativo || !mapeado || sincronizando}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {sincronizando ? "Sincronizando…" : "Sincronizar"}
          </Button>
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
