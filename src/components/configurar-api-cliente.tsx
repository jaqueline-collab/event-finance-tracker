import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  ListChecks,
  MessagesSquare,
  RefreshCw,
  Search,
  Tags,
} from "lucide-react";
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
  listarCamposDoPainel,
  listarCamposPersonalizados,
  listarClassificacoesRecentes,
  listarEtiquetasCliente,
  listarPaineisCliente,
  listarRotulosCliente,
  listarSequenciasCliente,
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
export function ConfigurarApiCliente({ clienteId }: { clienteId: string }) {


  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // 2. campos personalizados de contato
  const [campos, setCampos] = useState<CampoElora[] | null>(null);
  const [buscandoCampos, setBuscandoCampos] = useState(false);

  // 3. painéis
  const [paineis, setPaineis] = useState<PainelElora[] | null>(null);
  const [buscandoPaineis, setBuscandoPaineis] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [camposPainel, setCamposPainel] = useState<Record<string, CampoElora[]>>({});
  const [painelFunil, setPainelFunil] = useState("");

  // 4. sequências
  const [sequencias, setSequencias] = useState<{ id: string; nome: string }[] | null>(null);
  const [buscandoSeq, setBuscandoSeq] = useState(false);

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
    recarregarRotulosEConfig().catch(() => undefined);
  }, [clienteId, estado?.configurada, estado?.ativo]);

  const alternar = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const buscarCampos = async () => {
    setBuscandoCampos(true);
    try {
      const r = await listarCamposPersonalizados({ data: { clienteId } });
      setCampos(r.campos);
      if (r.campos.length === 0) toast.error("Nenhum campo personalizado encontrado nessa conta.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBuscandoCampos(false);
    }
  };


  const buscarPaineis = async () => {
    setBuscandoPaineis(true);
    try {
      const r = await listarPaineisCliente({ data: { clienteId } });
      setPaineis(r.paineis);
      if (r.paineis.length === 0) toast.error("Nenhum painel encontrado nessa conta.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBuscandoPaineis(false);
    }
  };

  const expandir = async (painelId: string) => {
    setAberto((a) => (a === painelId ? null : painelId));
    if (camposPainel[painelId]) return;
    try {
      const r = await listarCamposDoPainel({ data: { clienteId, painelId } });
      setCamposPainel((m) => ({ ...m, [painelId]: r.campos }));
    } catch (e) {
      toast.error(msg(e));
    }
  };

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


  const buscarSequencias = async () => {
    setBuscandoSeq(true);
    try {
      const r = await listarSequenciasCliente({ data: { clienteId } });
      setSequencias(r.sequencias);
      if (r.sequencias.length === 0) toast.error("Nenhuma sequência encontrada nessa conta.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setBuscandoSeq(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/clientes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para clientes
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Mapeamento e filtros da conta
        </h1>
        {estado?.configurada ? (
          <Badge variant={estado.ativo ? "secondary" : "outline"}>
            {estado.ativo ? `Conectada · ${estado.chaveMascarada}` : "Desligada"}
          </Badge>
        ) : (
          <Badge variant="outline">Não configurada</Badge>
        )}
      </div>

      {!estado?.configurada && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conecte a conta primeiro</AlertTitle>
          <AlertDescription>
            Volte ao cadastro do cliente, informe o endereço da conta e a chave de API, e teste a conexão.
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Campos personalizados de contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> Campos personalizados de contato
          </CardTitle>
          <CardDescription>
            Todos os campos da conta ficam disponíveis como fonte de dados para os widgets do
            painel. Nada fica preso a um lugar fixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={buscarCampos} disabled={buscandoCampos}>
            <Search className="mr-2 h-4 w-4" />
            {buscandoCampos ? "Buscando…" : "Buscar campos personalizados da conta"}
          </Button>

          {campos !== null && campos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum campo personalizado encontrado.</p>
          )}

          {campos !== null && campos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {campos.map((c) => (
                <Badge key={c.chave} variant="outline" title={c.chave}>
                  {c.nome}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Painéis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Painéis da conta
          </CardTitle>
          <CardDescription>Funis e etapas existentes na conta do cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={buscarPaineis} disabled={buscandoPaineis}>
            <Search className="mr-2 h-4 w-4" />
            {buscandoPaineis ? "Buscando…" : "Buscar painéis da conta"}
          </Button>

          {paineis !== null && paineis.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum painel encontrado.</p>
          )}

          <div className="space-y-2">
            {(paineis ?? []).map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => void expandir(p.id)}
                >
                  {aberto === p.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate font-medium">{p.titulo}</span>
                  {p.tipo && <Badge variant="outline">{p.tipo}</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.etapas.length} etapa{p.etapas.length === 1 ? "" : "s"}
                  </span>
                </button>
                {aberto === p.id && (
                  <div className="space-y-2 border-t border-border/60 px-3 py-2 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {p.etapas.map((e) => (
                        <Badge key={e.id} variant="secondary">
                          {e.nome}
                        </Badge>
                      ))}
                      {p.etapas.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem etapas.</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Campos personalizados do painel
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(camposPainel[p.id] ?? []).map((c) => (
                          <Badge key={c.chave} variant="outline">
                            {c.nome}
                          </Badge>
                        ))}
                        {(camposPainel[p.id] ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhum campo.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Sequências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-4 w-4" /> Sequências da conta
          </CardTitle>
          <CardDescription>Lista informativa das sequências configuradas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={buscarSequencias} disabled={buscandoSeq}>
            <Search className="mr-2 h-4 w-4" />
            {buscandoSeq ? "Buscando…" : "Buscar sequências da conta"}
          </Button>
          {sequencias !== null && (
            <div className="flex flex-wrap gap-1.5">
              {sequencias.map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.nome}
                </Badge>
              ))}
              {sequencias.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma sequência encontrada.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Classificações */}
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

      {/* 6. Meu Dash: construtor de widgets */}
      <WidgetBuilder
        clienteId={clienteId}
        rotulos={rotulos.map((r) => ({ id: r.id, nome: r.nome }))}
        campos={campos ?? []}
      />


      {/* 7. Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
          <CardDescription>
            Valem para a sincronização de contatos e para o painel do cliente. Em branco = sem restrição.
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
                  <SelectValue placeholder={campos ? "Escolha o campo" : "Busque os campos primeiro"} />
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
                  <SelectValue placeholder={paineis ? "Escolha o painel" : "Busque os painéis primeiro"} />
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
  );
}
