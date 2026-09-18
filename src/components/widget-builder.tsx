import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, LayoutGrid, Plus, Trash2 } from "lucide-react";
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
  excluirWidgetCliente,
  listarWidgetsCliente,
  reordenarWidgetsCliente,
  salvarWidgetCliente,
  type Widget,
} from "@/lib/dashboard-widgets.functions";

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

  const mover = async (index: number, delta: number) => {
    const destino = index + delta;
    if (destino < 0 || destino >= widgets.length) return;
    const nova = [...widgets];
    const [item] = nova.splice(index, 1);
    nova.splice(destino, 0, item);
    setWidgets(nova.map((w, i) => ({ ...w, ordem: i })));
    try {
      await reordenarWidgetsCliente({ data: { clienteId, ordem: nova.map((w) => w.id) } });
    } catch (e) {
      toast.error(msg(e));
      recarregar();
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

        <div className="space-y-2">
          {widgets.map((w, i) => (
            <div
              key={w.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="truncate text-sm font-medium">{w.titulo}</span>
              <Badge variant="outline">{TIPOS.find((t) => t.valor === w.tipo)?.rotulo ?? w.tipo}</Badge>
              <div className="ml-auto flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => mover(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => mover(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => editar(w)}>
                  Editar
                </Button>
                <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => remover(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
