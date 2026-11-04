import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Radio, History, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatarTelefoneBr } from "@/lib/dados-elora";
import {
  getDadosElora,
  listarCanaisElora,
  salvarCanaisPermitidos,
  salvarHistoricoDesde,
  salvarIntegracaoCliente,
  testarIntegracaoCliente,
  migrarChavesParaCofre,
  apagarChavesLegadas,
  type CanalElora,
} from "@/lib/integracao-elora.functions";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export function DadosEloraCliente({ clienteId, aba }: { clienteId: string; aba: "visao" | "conexao" | "canais" }) {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getDadosElora>> | null>(null);
  const [canais, setCanais] = useState<CanalElora[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [historico, setHistorico] = useState("");
  const [novaChave, setNovaChave] = useState("");
  const [trocando, setTrocando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const d = await getDadosElora({ data: { clienteId } });
      setInfo(d);
      setMarcados(new Set(d.canaisPermitidos));
      setHistorico(d.historicoDesde ?? "");
    } catch (e) {
      toast.error(msg(e));
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (rotulo: string, fn: () => Promise<void>) => {
    setOcupado(rotulo);
    try {
      await fn();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const cofre = info?.cofre;

  const somenteLeitura = (
    <Badge variant="outline" className="gap-1">
      <Lock className="h-3 w-3" /> Somente leitura. Nada é alterado no Elora.
    </Badge>
  );

  if (aba === "conexao") return <div className="space-y-4">        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Credencial
            </CardTitle>
            <CardDescription>
              {cofre?.noCofre
                ? `Chave guardada no cofre, termina em ${cofre.ultimos4}, trocada em ${dataBr(cofre.trocadaEm)}.`
                : "Chave ainda fora do cofre (use “Migrar chaves para o cofre” em Configurar API)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado !== null}
                onClick={() =>
                  executar("teste", async () => {
                    const r = await testarIntegracaoCliente({ data: { clienteId } });
                    r.conectado ? toast.success(r.mensagem) : toast.error(r.mensagem);
                  })
                }
              >
                {ocupado === "teste" ? "Testando…" : "Testar conexão"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTrocando((v) => !v)}>
                Trocar chave
              </Button>
            </div>
            {trocando && (
              <form
                className="space-y-2"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!baseUrl) return toast.error("Configure o endereço da conta primeiro.");
                  void executar("troca", async () => {
                    await salvarIntegracaoCliente({ data: { clienteId, baseUrl, apiKey: novaChave } });
                    setNovaChave("");
                    setTrocando(false);
                    toast.success("Chave trocada e guardada no cofre.");
                    await carregar();
                  });
                }}
              >
                <Label htmlFor="nova-chave">Nova chave</Label>
                <Input
                  id="nova-chave"
                  type="password"
                  autoComplete="new-password"
                  value={novaChave}
                  onChange={(e) => setNovaChave(e.target.value)}
                />
                <Button size="sm" type="submit" disabled={!novaChave.trim() || ocupado !== null}>
                  {ocupado === "troca" ? "Salvando…" : "Salvar no cofre"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card></div>;

  if (aba === "canais") return <div className="space-y-4">        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" /> Canais permitidos
            </CardTitle>
            <CardDescription>Sem nenhum canal marcado, nada deste cliente entra no banco.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              variant="outline"
              disabled={ocupado !== null}
              onClick={() =>
                executar("canais", async () => {
                  const r = await listarCanaisElora({ data: { clienteId } });
                  setCanais(r.canais);
                })
              }
            >
              {ocupado === "canais" ? "Buscando…" : canais ? "Atualizar lista" : "Buscar canais da conta"}
            </Button>
            {canais && canais.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum canal encontrado nesta conta.</p>
            )}
            {canais && canais.length > 0 && (
              <ul className="max-h-96 space-y-3 overflow-y-auto">
                {canais.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.nome}</span>
                      <span className="block text-sm">
                        {formatarTelefoneBr(c.numero)}
                        {!c.ativo && <span className="text-muted-foreground"> · inativo</span>}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">{c.id}</span>
                    </span>
                    <Switch
                      checked={marcados.has(c.id)}
                      onCheckedChange={(v) => {
                        const n = new Set(marcados);
                        v ? n.add(c.id) : n.delete(c.id);
                        setMarcados(n);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
            {!canais && info && (
              <p className="text-xs text-muted-foreground">{info.canaisPermitidos.length} canal(is) permitido(s).</p>
            )}
            {canais && (
              <Button
                size="sm"
                disabled={ocupado !== null}
                onClick={() =>
                  executar("salvar-canais", async () => {
                    const escolhidos = canais
                      .filter((c) => marcados.has(c.id))
                      .map((c) => ({ id: c.id, nome: c.nome, numero: c.numero }));
                    await salvarCanaisPermitidos({ data: { clienteId, canais: escolhidos } });
                    toast.success("Canais permitidos salvos.");
                    await carregar();
                  })
                }
              >
                Salvar canais
              </Button>
            )}
          </CardContent>
        </Card></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{somenteLeitura}</div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {["Estrutura", "Contatos", "Atendimentos", "Cards"].map((t) => (
              <Card key={t}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t}</span>
                    <Badge variant="outline">Em breve</Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted" />
                  <p className="text-xs text-muted-foreground">Ainda não sincroniza.</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sem avisos.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> O que sincronizar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {["Estrutura", "Contatos", "Atendimentos", "Cards", "Texto das conversas"].map((t) => (
                <li key={t} className="flex items-center justify-between gap-2 text-sm">
                  <span>{t}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Em breve</span>
                    <Switch disabled aria-label={`${t} (em breve)`} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label htmlFor="historico-desde">Histórico desde</Label>
              <Input id="historico-desde" type="date" value={historico} onChange={(e) => setHistorico(e.target.value)} />
              <Button
                size="sm"
                disabled={!historico || ocupado !== null}
                onClick={() =>
                  executar("historico", async () => {
                    await salvarHistoricoDesde({ data: { clienteId, historicoDesde: historico } });
                    toast.success("Data do histórico salva.");
                  })
                }
              >
                Salvar data
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button size="sm" variant="outline" disabled title="Em breve">Sincronizar agora</Button>
              <Button size="sm" variant="outline" disabled title="Em breve">Reprocessar tudo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CofreChavesAdmin() {
  const [res, setRes] = useState<{ titulo: string; itens: { nome: string; ok: boolean; motivo: string | null }[] } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState("");

  const rodar = async (fn: () => Promise<{ titulo: string; itens: any[] }>) => {
    setOcupado(true);
    try {
      setRes(await fn());
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> Cofre de chaves
        </CardTitle>
        <CardDescription>
          Copia as chaves do Elora App para o cofre cifrado. As chaves antigas só são apagadas quando você pedir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Button
            disabled={ocupado}
            onClick={() =>
              rodar(async () => {
                const r = await migrarChavesParaCofre();
                return {
                  titulo: `${r.migradas} migrada(s); ${r.jaNoCofre} já estavam no cofre.`,
                  itens: r.resultados,
                };
              })
            }
          >
            Migrar chaves para o cofre
          </Button>
          <div className="space-y-1">
            <Label htmlFor="confirmar-apagar" className="text-xs">
              Digite APAGAR para liberar
            </Label>
            <Input id="confirmar-apagar" className="h-9 w-32" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <Button
            variant="destructive"
            disabled={ocupado || confirmar !== "APAGAR"}
            onClick={() =>
              rodar(async () => {
                const r = await apagarChavesLegadas({ data: { confirmacao: "APAGAR" } });
                setConfirmar("");
                return { titulo: `${r.apagadas} chave(s) antiga(s) apagada(s).`, itens: r.resultados };
              })
            }
          >
            Apagar chaves antigas
          </Button>
        </div>
        {res && (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{res.titulo}</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {res.itens.map((i, k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="truncate">{i.nome}</span>
                  <span className={i.ok ? "text-muted-foreground" : "text-destructive"}>
                    {i.ok ? "ok" : i.motivo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
