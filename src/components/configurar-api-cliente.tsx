import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Filter,
  MessagesSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { salvarRelatorioDiarioAtivo } from "@/lib/integracao-elora.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  excluirRotuloCliente,
  getIntegracaoCliente,
  listarCamposPersonalizados,
  listarClassificacoesRecentes,
  listarEtiquetasCliente,
  listarPaineisCliente,
  listarRotulosCliente,
  listarUsuariosCliente,
  salvarFiltrosCliente,
  salvarRotuloCliente,
  sincronizarConversasCliente,
  type CampoElora,
  type PainelElora,
  type RotuloClassificacao,
} from "@/lib/integracao-elora.functions";

import { WidgetBuilder } from "@/components/widget-builder";
import { DadosIntegracaoCliente } from "@/components/dados-integracao-cliente";
import { RegrasRelatorio } from "@/components/regras-relatorio";

type Estado = Awaited<ReturnType<typeof getIntegracaoCliente>>;

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function CaixaMulti({
  titulo,
  itens,
  marcados,
  aoAlternar,
  vazio,
}: {
  titulo: string;
  itens: { id: string; nome: string }[];
  marcados: string[];
  aoAlternar: (id: string) => void;
  vazio: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{titulo}</Label>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 p-3">
          {itens.map((i) => (
            <label key={i.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={marcados.includes(i.id)} onCheckedChange={() => aoAlternar(i.id)} />
              <span className="truncate">{i.nome}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Conteúdo da tela "Configurar API" de um cliente. */
export function ConfigurarApiCliente({
  clienteId,
  aba,
  visaoId = null,
  soGraficos = false,
  aoMudarGraficos,
  novoGraficoChave = 0,
}: {
  clienteId: string;
  aba: "painel";
  /** Visão (aba do dash) cujos gráficos são editados. */
  visaoId?: string | null;
  /** Mostra só o construtor de gráficos (modo Editar do painel). */
  soGraficos?: boolean;
  aoMudarGraficos?: () => void;
  novoGraficoChave?: number;
}) {


  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // 2. campos personalizados de contato
  const [campos, setCampos] = useState<CampoElora[] | null>(null);

  // 3. painéis
  const [paineis, setPaineis] = useState<PainelElora[] | null>(null);
  const [painelFunil, setPainelFunil] = useState("");

  // 4. sequências

  // 5. classificações: descoberta + rótulos
  const [classificacoes, setClassificacoes] = useState<string[] | null>(null);
  const [buscandoCls, setBuscandoCls] = useState(false);
  const [sincConversas, setSincConversas] = useState(false);
  const [rotulos, setRotulos] = useState<RotuloClassificacao[]>([]);
  const [rotuloAberto, setRotuloAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [rotuloNome, setRotuloNome] = useState("");
  const [rotuloValores, setRotuloValores] = useState<string[]>([]);
  const [salvandoRotulo, setSalvandoRotulo] = useState(false);


  // 6. filtros
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [etiquetas, setEtiquetas] = useState<{ id: string; nome: string }[]>([]);
  const [fUsuarios, setFUsuarios] = useState<string[]>([]);
  const [fEtiquetas, setFEtiquetas] = useState<string[]>([]);
  const [fEtapas, setFEtapas] = useState<string[]>([]);
  const [fCampoChave, setFCampoChave] = useState("");
  const [fCampoValor, setFCampoValor] = useState("");
  const [fCampanha, setFCampanha] = useState("");
  const [salvandoFiltros, setSalvandoFiltros] = useState(false);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    getIntegracaoCliente({ data: { clienteId } })
      .then((r) => {
        setEstado(r);
        setFUsuarios(r.filtros.usuarios);
        setFEtiquetas(r.filtros.etiquetas);
        setFEtapas(r.filtros.etapasFunil);
        setFCampoChave(r.filtros.campoPersonalizado?.chave ?? "");
        setFCampoValor(r.filtros.campoPersonalizado?.valor ?? "");
        setFCampanha(r.filtros.campanha ?? "");
      })
      .catch((e) => setErro(msg(e)))
      .finally(() => setCarregando(false));
  }, [clienteId]);

  useEffect(recarregar, [recarregar]);

  // Listas de filtro carregam junto (usuários e etiquetas da conta).
  useEffect(() => {
    if (!estado?.configurada || !estado.ativo) return;
    listarUsuariosCliente({ data: { clienteId } })
      .then((r) => setUsuarios(r.usuarios))
      .catch(() => setUsuarios([]));
    listarEtiquetasCliente({ data: { clienteId } })
      .then((r) => setEtiquetas(r.etiquetas))
      .catch(() => setEtiquetas([]));
    listarCamposPersonalizados({ data: { clienteId } })
      .then((r) => setCampos(r.campos))
      .catch(() => setCampos([]));
    listarPaineisCliente({ data: { clienteId } })
      .then((r) => setPaineis(r.paineis))
      .catch(() => setPaineis([]));
    recarregarRotulosEConfig().catch(() => undefined);
  }, [clienteId, estado?.configurada, estado?.ativo]);

  const alternar = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);





  const recarregarRotulosEConfig = async () => {
    const r = await listarRotulosCliente({ data: { clienteId } });
    setRotulos(r.rotulos);
  };

  const salvarRotulo = async () => {
    if (!rotuloNome.trim()) { toast.error("Dê um nome ao rótulo."); return; }
    if (rotuloValores.length === 0) { toast.error("Marque ao menos uma classificação para o rótulo."); return; }
    setSalvandoRotulo(true);
    try {
      await salvarRotuloCliente({
        data: {
          clienteId,
          rotuloId: editando && editando !== "novo" ? editando : null,
          nome: rotuloNome.trim(),
          valores: rotuloValores,
        },
      });
      toast.success("Rótulo salvo.");
      setEditando(null);
      await recarregarRotulosEConfig();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvandoRotulo(false);
    }
  };

  const excluirRotulo = async (id: string) => {
    try {
      await excluirRotuloCliente({ data: { clienteId, rotuloId: id } });
      toast.success("Rótulo excluído. As peças do painel que usavam ele ficaram sem rótulo.");
      await recarregarRotulosEConfig();
    } catch (e) {
      toast.error(msg(e));
    }
  };



  const buscarClassificacoes = async () => {
    setBuscandoCls(true);
    try {
      const r = await listarClassificacoesRecentes({ data: { clienteId } });
      setClassificacoes(r.classificacoes);
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBuscandoCls(false);
    }
  };

  const sincronizarConversas = async () => {
    setSincConversas(true);
    try {
      const r = await sincronizarConversasCliente({ data: { clienteId } });
      toast.success(`Conversas sincronizadas: ${r.conversas} processadas.`);
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSincConversas(false);
    }
  };

  const salvarFiltros = async () => {
    setSalvandoFiltros(true);
    try {
      await salvarFiltrosCliente({
        data: {
          clienteId,
          usuarios: fUsuarios,
          etiquetas: fEtiquetas,
          etapasFunil: fEtapas,
          campoPersonalizado: fCampoChave ? { chave: fCampoChave, valor: fCampoValor } : null,
          campanha: fCampanha.trim() ? fCampanha.trim() : null,
        },
      });
      toast.success("Filtros salvos. Valem para a sincronização e para o painel do cliente.");
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvandoFiltros(false);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível abrir esta página</AlertTitle>
        <AlertDescription>{erro}</AlertDescription>
      </Alert>
    );
  }

  const etapasDisponiveis =
    paineis?.find((p) => p.id === painelFunil)?.etapas ??
    (paineis ?? []).flatMap((p) => p.etapas);


  if (soGraficos) {
    return (
      <WidgetBuilder
        key={visaoId ?? "padrao"}
        clienteId={clienteId}
        visaoId={visaoId}
        aoMudar={aoMudarGraficos}
        novoChave={novoGraficoChave}
        compacto
        rotulos={rotulos.map((r) => ({ id: r.id, nome: r.nome }))}
        campos={campos ?? []}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* ===== Aba Painel do cliente ===== */}
      <div className={aba === "painel" ? "space-y-6" : "hidden"}>
      {!estado?.configurada && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conecte a conta primeiro</AlertTitle>
          <AlertDescription>Na aba Conexão, informe o endereço da conta e a chave de API, e teste a conexão.</AlertDescription>
        </Alert>
      )}

      {estado?.configurada && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automação externa (n8n)</CardTitle>
            <CardDescription>
              O relatório diário já é calculado pelo próprio app. Ligue só se este cliente ainda
              precisa entrar na lista que a automação externa (n8n) usa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="relatorio-diario-ativo"
                checked={estado.relatorioDiarioAtivo}
                onCheckedChange={(v) => {
                  const anterior = estado.relatorioDiarioAtivo;
                  setEstado({ ...estado, relatorioDiarioAtivo: v });
                  salvarRelatorioDiarioAtivo({ data: { clienteId, ativo: v } })
                    .then(() => toast.success(v ? "Automação externa ligada." : "Automação externa desligada."))
                    .catch((e) => {
                      setEstado({ ...estado, relatorioDiarioAtivo: anterior });
                      toast.error(e instanceof Error ? e.message : String(e));
                    });
                }}
              />
              <Label htmlFor="relatorio-diario-ativo">
                {estado.relatorioDiarioAtivo ? "Enviar à automação externa (n8n)" : "Fora da automação externa"}
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      <RegrasRelatorio clienteId={clienteId} />

      {/* 5. Classificações: só para quem usa (classificação sincronizada ou rótulo criado) */}
      {(rotulos.length > 0 || Boolean(estado?.ultimaSyncConversas)) && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="h-4 w-4" /> Classificações de atendimento
          </CardTitle>
          <CardDescription>
            São texto livre digitado pela equipe ao concluir a conversa — a lista vem de uma amostra
            dos últimos 90 dias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={buscarClassificacoes} disabled={buscandoCls}>
              <Search className="mr-2 h-4 w-4" />
              {buscandoCls ? "Buscando…" : "Buscar classificações usadas recentemente"}
            </Button>
            <Button size="sm" variant="outline" onClick={sincronizarConversas} disabled={sincConversas}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {sincConversas ? "Sincronizando…" : "Sincronizar conversas"}
            </Button>
          </div>

          {classificacoes !== null && classificacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma classificação encontrada nos últimos 90 dias — você pode reconfigurar isso quando a
              equipe começar a classificar atendimentos.
            </p>
          )}

          {/* Rótulos: nome próprio + valores brutos agrupados */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Rótulos desta conta</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditando("novo");
                  setRotuloNome("");
                  setRotuloValores([]);
                }}
              >
                Novo rótulo
              </Button>
            </div>

            {rotulos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum rótulo ainda. Crie um para agrupar classificações (ex.: "Consulta agendada"
                reunindo "Consulta Agendada" e "Consulta agendou").
              </p>
            )}

            {rotulos.map((r) => (
              <div key={r.id} className="rounded-md border border-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  onClick={() => setRotuloAberto((a) => (a === r.id ? null : r.id))}
                >
                  <span className="text-sm font-medium">
                    {r.nome}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({r.valores.length}{" "}
                      {r.valores.length === 1 ? "classificação" : "classificações"})
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditando(r.id);
                        setRotuloNome(r.nome);
                        setRotuloValores(r.valores);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        excluirRotulo(r.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </span>
                </button>
                {rotuloAberto === r.id && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                    {r.valores.map((v) => (
                      <Badge key={v} variant="outline">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {editando !== null && (
              <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                <div className="space-y-1">
                  <Label>Nome do rótulo</Label>
                  <Input
                    value={rotuloNome}
                    onChange={(e) => setRotuloNome(e.target.value)}
                    placeholder="Ex.: Consulta agendada"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Classificações que entram nesse rótulo</Label>
                  {classificacoes === null || classificacoes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Busque as classificações usadas recentemente para escolher os valores.
                    </p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {classificacoes.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={rotuloValores.includes(c)}
                            onChange={() =>
                              setRotuloValores((v) =>
                                v.includes(c) ? v.filter((x) => x !== c) : [...v, c],
                              )
                            }
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={salvarRotulo} disabled={salvandoRotulo}>
                    {salvandoRotulo ? "Salvando…" : "Salvar rótulo"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditando(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Se a equipe mudar o texto que usa, a contagem para até o valor novo entrar num rótulo.
              {estado?.ultimaSyncConversas
                ? ` Última sincronização de conversas: ${new Date(estado.ultimaSyncConversas).toLocaleString("pt-BR")}.`
                : " Conversas ainda não sincronizadas."}
            </p>
          </div>
        </CardContent>
      </Card>
      )}
      {/* "Meu Dash" saiu desta aba: Matriz e visões substituem. Widgets salvos continuam guardados. */}


      {/* 7. Listas da conta (alimentam os filtros dos widgets) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Listas e filtros padrão da conta
          </CardTitle>
          <CardDescription>
            A sincronização traz a base inteira; cada widget aplica o próprio filtro na exibição.
            O que você marcar aqui vale como sugestão inicial para novos widgets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CaixaMulti
              titulo="Usuários"
              itens={usuarios}
              marcados={fUsuarios}
              aoAlternar={(id) => alternar(fUsuarios, setFUsuarios, id)}
              vazio="A conta não liberou a lista de usuários para esta chave."
            />
            <CaixaMulti
              titulo="Etiquetas"
              itens={etiquetas}
              marcados={fEtiquetas}
              aoAlternar={(id) => alternar(fEtiquetas, setFEtiquetas, id)}
              vazio="Nenhuma etiqueta disponível."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Campo personalizado</Label>
              <Select value={fCampoChave || undefined} onValueChange={setFCampoChave}>
                <SelectTrigger>
                  <SelectValue placeholder={campos === null ? "Carregando…" : campos.length ? "Escolha o campo" : "Nenhum campo encontrado"} />
                </SelectTrigger>
                <SelectContent>
                  {(campos ?? []).map((c) => (
                    <SelectItem key={c.chave} value={c.chave}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-campo-valor">Valor do campo</Label>
              <Input
                id="f-campo-valor"
                value={fCampoValor}
                onChange={(e) => setFCampoValor(e.target.value)}
                placeholder="Deixe em branco para aceitar qualquer valor preenchido"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Painel de Vendas (para escolher etapas)</Label>
              <Select value={painelFunil || undefined} onValueChange={setPainelFunil}>
                <SelectTrigger>
                  <SelectValue placeholder={paineis === null ? "Carregando…" : paineis.length ? "Escolha o painel" : "Nenhum painel encontrado"} />
                </SelectTrigger>
                <SelectContent>
                  {(paineis ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-campanha">Campanha patrocinada</Label>
              <Input
                id="f-campanha"
                value={fCampanha}
                onChange={(e) => setFCampanha(e.target.value)}
                placeholder="Parte do nome da campanha"
              />
            </div>
          </div>

          <CaixaMulti
            titulo="Etapas do funil"
            itens={etapasDisponiveis.map((e) => ({ id: e.id, nome: e.nome }))}
            marcados={fEtapas}
            aoAlternar={(id) => alternar(fEtapas, setFEtapas, id)}
            vazio="Busque os painéis para listar as etapas."
          />

          <Button size="sm" onClick={salvarFiltros} disabled={salvandoFiltros}>
            {salvandoFiltros ? "Salvando…" : "Salvar filtros"}
          </Button>
        </CardContent>
      </Card>

      <DadosIntegracaoCliente clienteId={clienteId} nomeCliente={clienteId} />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Limites da API do app Elora</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <p>
            Campanha não é um cadastro da conta: o ranking do painel é montado a partir dos dados de
            anúncio dos contatos. O link de rastreamento só existe quando houve clique rastreado.
          </p>
          <p>
            Classificações são texto livre por atendimento. Se a equipe mudar o texto, a contagem cai a
            zero até o mapeamento ser refeito aqui.
          </p>
          <p>
            Painéis, sequências, usuários e conversas exigem que a chave de API da conta tenha permissão
            para esses recursos. Sem permissão, a busca avisa e as listas ficam vazias.
          </p>
        </AlertDescription>
      </Alert>
      </div>
    </div>
  );
}
