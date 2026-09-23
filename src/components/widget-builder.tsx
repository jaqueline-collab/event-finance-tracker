import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, LayoutGrid, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aplicarModeloEmClientes,
  excluirModeloPainel,
  excluirWidgetCliente,
  listarModelosPainel,
  listarWidgetsCliente,
  salvarGradeCliente,
  salvarPainelComoModelo,
  salvarWidgetCliente,
  type ModeloPainel,
  type Widget,
} from "@/lib/dashboard-widgets.functions";
import { DashboardGrid } from "@/components/dashboard-grid";
import { normalizarGrade, proximaPosicao, type ItemGrade } from "@/lib/grid-layout";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const TIPOS: { valor: Widget["tipo"]; rotulo: string }[] = [
  { valor: "metrico", rotulo: "Bloco métrico" },
  { valor: "pizza", rotulo: "Gráfico de pizza" },
  { valor: "barras", rotulo: "Gráfico de barras" },
  { valor: "calendario", rotulo: "Calendário" },
  { valor: "ranking", rotulo: "Ranking de campanhas" },
  { valor: "tabela", rotulo: "Tabela de contatos" },
];

const CRITERIOS = [
  { valor: "total_contatos", rotulo: "Novos contatos" },
  { valor: "rotulo", rotulo: "Classificação (rótulo)" },
  { valor: "conversas_resposta", rotulo: "Conversas com resposta" },
  { valor: "tempo_espera", rotulo: "Tempo até a primeira resposta" },
  { valor: "tempo_atendimento", rotulo: "Tempo de atendimento" },
];

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Campo = { chave: string; nome: string };

type Rascunho = {
  widgetId: string | null;
  tipo: Widget["tipo"];
  titulo: string;
  criterio: string;
  formato: "inteiro" | "moeda";
  rotuloId: string;
  secundario: boolean;
  dimensao: string;
  modo: string;
  series: { rotuloId: string }[];
  camadas: { campoChave: string; rotulo: string; cor: string }[];
  camposUsados: string[];
  filtroCampanha: string;
  filtroCampoChave: string;
  filtroCampoValor: string;
};

const vazio = (tipo: Widget["tipo"]): Rascunho => ({
  widgetId: null,
  tipo,
  titulo: "",
  criterio: "total_contatos",
  formato: "inteiro",
  rotuloId: "",
  secundario: false,
  dimensao: "origem",
  modo: "lado",
  series: [{ rotuloId: "" }],
  camadas: [{ campoChave: "", rotulo: "", cor: CORES[0] }],
  camposUsados: [],
  filtroCampanha: "",
  filtroCampoChave: "",
  filtroCampoValor: "",
});

/** Construtor de widgets do painel do cliente ("Meu Dash"). */
export function WidgetBuilder({
  clienteId,
  rotulos,
  campos,
}: {
  clienteId: string;
  rotulos: { id: string; nome: string }[];
  campos: Campo[];
}) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [modelos, setModelos] = useState<ModeloPainel[]>([]);
  const [nomeModelo, setNomeModelo] = useState("");

  const grade = useMemo(() => normalizarGrade(widgets), [widgets]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    listarWidgetsCliente({ data: { clienteId } })
      .then((r) => setWidgets(r.widgets))
      .catch((e) => toast.error(msg(e)))
      .finally(() => setCarregando(false));
  }, [clienteId]);

  useEffect(recarregar, [recarregar]);

  const editar = (w: Widget) => {
    const c = (w.configuracao ?? {}) as any;
    setRascunho({
      widgetId: w.id,
      tipo: w.tipo as Widget["tipo"],
      titulo: w.titulo,
      criterio: String(c.criterio ?? "total_contatos"),
      formato: c.formato === "moeda" ? "moeda" : "inteiro",
      rotuloId: c.rotuloId ? String(c.rotuloId) : "",
      secundario: c.secundario === "anuncio",
      dimensao: String(c.dimensao ?? "origem"),
      modo: String(c.modo ?? "lado"),
      series: Array.isArray(c.series) && c.series.length > 0
        ? c.series.map((s: any) => ({ rotuloId: s?.rotuloId ? String(s.rotuloId) : "" }))
        : [{ rotuloId: "" }],
      camadas: Array.isArray(c.camadas) && c.camadas.length > 0
        ? c.camadas.map((x: any, i: number) => ({
            campoChave: String(x?.campoChave ?? ""),
            rotulo: String(x?.rotulo ?? ""),
            cor: String(x?.cor ?? CORES[i % CORES.length]),
          }))
        : [{ campoChave: "", rotulo: "", cor: CORES[0] }],
      camposUsados: Array.isArray(c.camposUsados) ? c.camposUsados.map(String) : [],
      filtroCampanha: c?.filtros?.campanha ? String(c.filtros.campanha) : "",
      filtroCampoChave: c?.filtros?.campoPersonalizado?.chave
        ? String(c.filtros.campoPersonalizado.chave)
        : "",
      filtroCampoValor: c?.filtros?.campoPersonalizado?.valor
        ? String(c.filtros.campoPersonalizado.valor)
        : "",
    });
  };

  const montarConfig = (r: Rascunho) => {
    const filtros: any = {
      campanha: r.filtroCampanha.trim() || null,
      campoPersonalizado: r.filtroCampoChave
        ? { chave: r.filtroCampoChave, valor: r.filtroCampoValor }
        : null,
    };
    const camposUsados = new Set<string>(r.camposUsados);
    if (r.filtroCampoChave) camposUsados.add(r.filtroCampoChave);
    for (const c of r.camadas) if (c.campoChave) camposUsados.add(c.campoChave);

    const base: any = { fonte: r.tipo === "metrico" && r.criterio !== "total_contatos" ? "conversas" : "contatos", filtros, camposUsados: [...camposUsados] };

    if (r.tipo === "metrico") {
      return {
        ...base,
        criterio: r.criterio,
        formato: r.formato === "moeda" ? "moeda" : "inteiro",
        rotuloId: r.criterio === "rotulo" && r.rotuloId ? r.rotuloId : null,
        secundario: r.secundario ? "anuncio" : null,
      };
    }
    if (r.tipo === "pizza") return { ...base, dimensao: r.dimensao };
    if (r.tipo === "barras") {
      return {
        ...base,
        fonte: "conversas",
        modo: r.modo,
        series: r.series.filter((s) => s.rotuloId).map((s) => ({ rotuloId: s.rotuloId })),
      };
    }
    if (r.tipo === "calendario") {
      return {
        ...base,
        camadas: r.camadas
          .filter((c) => c.campoChave)
          .map((c, i) => ({
            campoChave: c.campoChave,
            rotulo: c.rotulo || campos.find((x) => x.chave === c.campoChave)?.nome || c.campoChave,
            cor: c.cor || CORES[i % CORES.length],
          })),
      };
    }
    return base;
  };

  const salvar = async () => {
    if (!rascunho) return;
    if (!rascunho.titulo.trim()) {
      toast.error("Dê um título ao widget.");
      return;
    }
    setSalvando(true);
    try {
      await salvarWidgetCliente({
        data: {
          clienteId,
          widgetId: rascunho.widgetId,
          tipo: rascunho.tipo,
          titulo: rascunho.titulo.trim(),
          configuracao: montarConfig(rascunho),
          ordem: rascunho.widgetId
            ? (widgets.find((w) => w.id === rascunho.widgetId)?.ordem ?? 0)
            : widgets.length,
          layout: rascunho.widgetId
            ? (widgets.find((w) => w.id === rascunho.widgetId)?.layout ?? null)
            : proximaPosicao(grade as ItemGrade[]),
        },
      });
      toast.success("Widget salvo.");
      setRascunho(null);
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    try {
      await excluirWidgetCliente({ data: { clienteId, widgetId: id } });
      toast.success("Widget removido.");
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    }
  };

  const aoMudarGrade = (nova: ItemGrade<Widget>[]) => {
    setWidgets(nova.map((g, i) => ({ ...g.item, layout: g.layout, ordem: i })));
  };

  const persistirGrade = async (itens: ItemGrade<Widget>[]) => {
    try {
      await salvarGradeCliente({
        data: {
          clienteId,
          blocos: itens.map((g) => ({ id: g.id, layout: g.layout })),
        },
      });
    } catch (e) {
      toast.error(msg(e));
      recarregar();
    }
  };

  /* ---------------- Modelos de painel ---------------- */

  const carregarModelos = useCallback(() => {
    listarModelosPainel()
      .then((r) => setModelos(r.modelos))
      .catch((e) => toast.error(msg(e)));
  }, []);

  useEffect(carregarModelos, [carregarModelos]);

  const salvarComoModelo = async () => {
    const nome = nomeModelo.trim();
    if (!nome) {
      toast.error("Dê um nome ao modelo.");
      return;
    }
    try {
      const r = await salvarPainelComoModelo({ data: { clienteId, nome, descricao: null } });
      toast.success(`Modelo "${nome}" salvo com ${r.total} widget(s).`);
      setNomeModelo("");
      carregarModelos();
    } catch (e) {
      toast.error(msg(e));
    }
  };

  const aplicarModelo = async (m: ModeloPainel) => {
    const ok = window.confirm(
      "Isso substitui todos os widgets atuais deste cliente pelos do modelo. Confirmar?",
    );
    if (!ok) return;
    try {
      await aplicarModeloEmClientes({ data: { modeloId: m.id, clienteIds: [clienteId] } });
      toast.success(`Modelo "${m.nome}" aplicado.`);
      recarregar();
    } catch (e) {
      toast.error(msg(e));
    }
  };

  const removerModelo = async (m: ModeloPainel) => {
    if (!window.confirm(`Apagar o modelo "${m.nome}"? Painéis já aplicados não mudam.`)) return;
    try {
      await excluirModeloPainel({ data: { modeloId: m.id } });
      toast.success("Modelo apagado.");
      carregarModelos();
    } catch (e) {
      toast.error(msg(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4" /> Meu Dash
        </CardTitle>
        <CardDescription>
          Monte o painel que o cliente vê. Cada peça é um widget: você escolhe o tipo, o título, a
          fonte dos dados e a ordem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" variant="outline" onClick={() => setRascunho(vazio("metrico"))}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar widget
        </Button>

        {carregando && <p className="text-sm text-muted-foreground">Carregando widgets…</p>}
        {!carregando && widgets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum widget ainda. O painel do cliente fica vazio até você adicionar o primeiro.
          </p>
        )}

        <div>
          <DashboardGrid
            itens={grade}
            onChange={aoMudarGrade}
            onCommit={(itens) => void persistirGrade(itens)}
            renderItem={(g) => (
              <div className="flex h-full flex-col gap-1 rounded-lg border border-border/60 bg-card px-3 py-2">
                <span className="truncate pr-6 text-sm font-medium">{g.item.titulo}</span>
                <Badge variant="outline" className="w-fit">
                  {TIPOS.find((t) => t.valor === g.item.tipo)?.rotulo ?? g.item.tipo}
                </Badge>
                <div className="mt-auto flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => editar(g.item)}>
                    Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover"
                    onClick={() => remover(g.item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
        {widgets.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Arraste pela alça no topo do bloco para mover e pelo canto inferior direito para
            redimensionar. No celular os blocos aparecem empilhados.
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <LayoutTemplate className="h-4 w-4" /> Modelos de painel
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="nome-modelo">Salvar painel atual como modelo</Label>
              <Input
                id="nome-modelo"
                className="w-64"
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                placeholder="Ex.: Modelo Clínica Essencial"
              />
            </div>
            <Button size="sm" variant="outline" onClick={salvarComoModelo}>
              <Copy className="mr-2 h-4 w-4" /> Salvar como modelo
            </Button>
          </div>
          {modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {modelos.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5"
                >
                  <span className="truncate text-sm">{m.nome}</span>
                  <Badge variant="outline">{m.widgets.length} widget(s)</Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => aplicarModelo(m)}>
                      Aplicar neste cliente
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Apagar modelo"
                      onClick={() => removerModelo(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {rascunho && (
          <div className="space-y-4 rounded-lg border border-dashed border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="widget-titulo">Título</Label>
                <Input
                  id="widget-titulo"
                  value={rascunho.titulo}
                  onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
                  placeholder="Ex.: Consultas agendadas"
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={rascunho.tipo}
                  onValueChange={(v) => setRascunho({ ...rascunho, tipo: v as Widget["tipo"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {rascunho.tipo === "metrico" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>O que contar</Label>
                  <Select
                    value={rascunho.criterio}
                    onValueChange={(v) => setRascunho({ ...rascunho, criterio: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITERIOS.map((c) => (
                        <SelectItem key={c.valor} value={c.valor}>
                          {c.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {rascunho.criterio === "rotulo" && (
                  <div className="space-y-1">
                    <Label>Rótulo de classificação</Label>
                    <Select
                      value={rascunho.rotuloId || undefined}
                      onValueChange={(v) => setRascunho({ ...rascunho, rotuloId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o rótulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {rotulos.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Formato do número</Label>
                  <Select
                    value={rascunho.formato}
                    onValueChange={(v) =>
                      setRascunho({ ...rascunho, formato: v === "moeda" ? "moeda" : "inteiro" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inteiro">Inteiro (162)</SelectItem>
                      <SelectItem value="moeda">Valor financeiro (R$ 12.345,67)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rascunho.secundario}
                    onChange={(e) => setRascunho({ ...rascunho, secundario: e.target.checked })}
                  />
                  Mostrar também quantos vieram de anúncio
                </label>
              </div>
            )}

            {rascunho.tipo === "pizza" && (
              <div className="space-y-1 sm:w-1/2">
                <Label>Dividir por</Label>
                <Select
                  value={rascunho.dimensao}
                  onValueChange={(v) => setRascunho({ ...rascunho, dimensao: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="origem">Origem (anúncio ou orgânico)</SelectItem>
                    <SelectItem value="campanha">Campanha</SelectItem>
                    <SelectItem value="classificacao">Classificação da conversa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {rascunho.tipo === "barras" && (
              <div className="space-y-3">
                <div className="space-y-1 sm:w-1/2">
                  <Label>Modo</Label>
                  <Select
                    value={rascunho.modo}
                    onValueChange={(v) => setRascunho({ ...rascunho, modo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lado">Lado a lado</SelectItem>
                      <SelectItem value="empilhado">Empilhado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {rascunho.series.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <Label>Série {i + 1}</Label>
                    <Select
                      value={s.rotuloId || undefined}
                      onValueChange={(v) => {
                        const series = [...rascunho.series];
                        series[i] = { rotuloId: v };
                        setRascunho({ ...rascunho, series });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o rótulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {rotulos.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRascunho({ ...rascunho, series: [...rascunho.series, { rotuloId: "" }] })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar série
                </Button>
              </div>
            )}

            {rascunho.tipo === "calendario" && (
              <div className="space-y-3">
                {rascunho.camadas.map((c, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Camada {i + 1} · campo de data</Label>
                      <Select
                        value={c.campoChave || undefined}
                        onValueChange={(v) => {
                          const camadas = [...rascunho.camadas];
                          camadas[i] = { ...camadas[i], campoChave: v };
                          setRascunho({ ...rascunho, camadas });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={campos.length ? "Escolha o campo" : "Busque os campos primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {campos.map((x) => (
                            <SelectItem key={x.chave} value={x.chave}>
                              {x.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Nome da camada</Label>
                      <Input
                        value={c.rotulo}
                        onChange={(e) => {
                          const camadas = [...rascunho.camadas];
                          camadas[i] = { ...camadas[i], rotulo: e.target.value };
                          setRascunho({ ...rascunho, camadas });
                        }}
                        placeholder="Ex.: Data da consulta"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRascunho({
                      ...rascunho,
                      camadas: [
                        ...rascunho.camadas,
                        { campoChave: "", rotulo: "", cor: CORES[rascunho.camadas.length % CORES.length] },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar camada
                </Button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Filtro · campanha</Label>
                <Input
                  value={rascunho.filtroCampanha}
                  onChange={(e) => setRascunho({ ...rascunho, filtroCampanha: e.target.value })}
                  placeholder="Parte do nome"
                />
              </div>
              <div className="space-y-1">
                <Label>Filtro · campo</Label>
                <Select
                  value={rascunho.filtroCampoChave || undefined}
                  onValueChange={(v) => setRascunho({ ...rascunho, filtroCampoChave: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={campos.length ? "Escolha" : "Busque os campos"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campos.map((x) => (
                      <SelectItem key={x.chave} value={x.chave}>
                        {x.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Filtro · valor</Label>
                <Input
                  value={rascunho.filtroCampoValor}
                  onChange={(e) => setRascunho({ ...rascunho, filtroCampoValor: e.target.value })}
                  placeholder="Em branco = qualquer valor"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar widget"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRascunho(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
