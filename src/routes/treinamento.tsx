import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, GraduationCap, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  excluirItemTreinamento,
  getTreinamentoAdmin,
  reordenarVideos,
  salvarMedalha,
  salvarNivel,
  salvarTrilha,
  salvarVideo,
} from "@/lib/treinamento.functions";
import type { Trilha } from "@/lib/treinamento";

export const Route = createFileRoute("/treinamento")({
  head: () => ({
    meta: [
      { title: "Treinamento · Elora" },
      {
        name: "description",
        content: "Monte trilhas de vídeos, níveis e medalhas do treinamento de parceiros e clientes.",
      },
      { property: "og:title", content: "Treinamento · Elora" },
      { property: "og:description", content: "Administração das trilhas de treinamento da Elora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaTreinamento,
});

type Dados = Awaited<ReturnType<typeof getTreinamentoAdmin>>;

const trilhaVazia = {
  titulo: "",
  descricao: "",
  audiencia: "parceiro" as "parceiro" | "cliente",
  ativa: true,
  pontosBonusConclusao: 50,
  ordem: 0,
};

function PaginaTreinamento() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novaTrilha, setNovaTrilha] = useState({ ...trilhaVazia });
  const [busca, setBusca] = useState("");
  const [audienciaFiltro, setAudienciaFiltro] = useState<"todas" | "parceiro" | "cliente">("todas");
  const [statusFiltro, setStatusFiltro] = useState<"todas" | "ativas" | "desativadas">("todas");
  const [videoForm, setVideoForm] = useState<Record<string, { titulo: string; url: string; pontos: string }>>({});
  const [medalha, setMedalha] = useState({
    nome: "",
    descricao: "",
    icone: "Award",
    criterioTipo: "videos" as "trilha" | "pontos" | "videos",
    criterioValor: "3",
  });

  const carregar = () => {
    setCarregando(true);
    setErro(null);
    getTreinamentoAdmin()
      .then((d) => setDados(d as Dados))
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const executar = async (acao: () => Promise<unknown>, ok: string) => {
    try {
      await acao();
      toast.success(ok);
      carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  if (carregando) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Treinamento indisponível</CardTitle>
            <CardDescription>{erro}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const todasTrilhas = (dados?.trilhas ?? []) as Trilha[];
  const trilhasFiltradas = todasTrilhas.filter((t) => {
    const q = busca.trim().toLowerCase();
    if (q && !t.titulo.toLowerCase().includes(q)) return false;
    if (audienciaFiltro !== "todas" && t.audiencia !== audienciaFiltro) return false;
    if (statusFiltro === "ativas" && !t.ativa) return false;
    if (statusFiltro === "desativadas" && t.ativa) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Treinamento</h1>
      </div>

      {/* Nova trilha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nova trilha</CardTitle>
          <CardDescription>Escolha se ela aparece para parceiros ou para clientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trilha-titulo">Título</Label>
            <Input
              id="trilha-titulo"
              value={novaTrilha.titulo}
              onChange={(e) => setNovaTrilha({ ...novaTrilha, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilha-audiencia">Para quem</Label>
            <Select
              value={novaTrilha.audiencia}
              onValueChange={(v) => setNovaTrilha({ ...novaTrilha, audiencia: v as "parceiro" | "cliente" })}
            >
              <SelectTrigger id="trilha-audiencia">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parceiro">Parceiros</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="trilha-descricao">Descrição</Label>
            <Textarea
              id="trilha-descricao"
              value={novaTrilha.descricao}
              onChange={(e) => setNovaTrilha({ ...novaTrilha, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilha-bonus">Pontos de bônus ao concluir</Label>
            <Input
              id="trilha-bonus"
              inputMode="numeric"
              value={String(novaTrilha.pontosBonusConclusao)}
              onChange={(e) =>
                setNovaTrilha({ ...novaTrilha, pontosBonusConclusao: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={novaTrilha.titulo.trim().length < 2}
              onClick={() =>
                executar(
                  () =>
                    salvarTrilha({
                      data: {
                        titulo: novaTrilha.titulo.trim(),
                        descricao: novaTrilha.descricao.trim() || null,
                        audiencia: novaTrilha.audiencia,
                        ativa: true,
                        pontosBonusConclusao: novaTrilha.pontosBonusConclusao,
                        ordem: todasTrilhas.length + 1,
                      },
                    }).then(() => setNovaTrilha({ ...trilhaVazia })),
                  "Trilha criada.",
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Criar trilha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Busca e filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar trilha pelo título"
          aria-label="Buscar trilha pelo título"
          className="sm:max-w-xs"
        />
        <Select value={audienciaFiltro} onValueChange={(v) => setAudienciaFiltro(v as typeof audienciaFiltro)}>
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por audiência">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as audiências</SelectItem>
            <SelectItem value="parceiro">Parceiros</SelectItem>
            <SelectItem value="cliente">Clientes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="desativadas">Desativadas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {trilhasFiltradas.length === 0 && todasTrilhas.length > 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma trilha com esses filtros.</p>
      )}

      {/* Trilhas existentes */}
      {trilhasFiltradas.map((t) => {
        const form = videoForm[t.id] ?? { titulo: "", url: "", pontos: "10" };
        return (
          <Card key={t.id}>
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{t.titulo}</CardTitle>
                <CardDescription>
                  {t.audiencia === "parceiro" ? "Parceiros" : "Clientes"} · {t.videos.length} vídeos · bônus{" "}
                  {t.pontosBonusConclusao} pts
                </CardDescription>
              </div>
              <Badge variant={t.ativa ? "secondary" : "outline"}>{t.ativa ? "Ativa" : "Desativada"}</Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor={`ativa-${t.id}`} className="text-xs text-muted-foreground">
                  Ativa
                </Label>
                <Switch
                  id={`ativa-${t.id}`}
                  checked={t.ativa}
                  onCheckedChange={(v) =>
                    executar(
                      () =>
                        salvarTrilha({
                          data: {
                            id: t.id,
                            titulo: t.titulo,
                            descricao: t.descricao,
                            audiencia: t.audiencia,
                            ativa: v,
                            pontosBonusConclusao: t.pontosBonusConclusao,
                            ordem: t.ordem,
                          },
                        }),
                      v ? "Trilha ativada." : "Trilha desativada (o progresso foi mantido).",
                    )
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                {t.videos.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{v.titulo}</span>
                    <span className="text-xs text-muted-foreground">{v.pontos} pts</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Subir"
                      disabled={i === 0}
                      onClick={() => {
                        const ids = t.videos.map((x) => x.id);
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        executar(() => reordenarVideos({ data: { ids } }), "Ordem atualizada.");
                      }}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Descer"
                      disabled={i === t.videos.length - 1}
                      onClick={() => {
                        const ids = t.videos.map((x) => x.id);
                        [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                        executar(() => reordenarVideos({ data: { ids } }), "Ordem atualizada.");
                      }}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remover vídeo"
                      onClick={() =>
                        executar(
                          () => excluirItemTreinamento({ data: { id: v.id, tipo: "video" } }),
                          "Vídeo removido.",
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_1fr_100px_auto]">
                <Input
                  placeholder="Título do vídeo"
                  aria-label="Título do vídeo"
                  value={form.titulo}
                  onChange={(e) => setVideoForm({ ...videoForm, [t.id]: { ...form, titulo: e.target.value } })}
                />
                <Input
                  placeholder="Link do YouTube"
                  aria-label="Link do YouTube"
                  value={form.url}
                  onChange={(e) => setVideoForm({ ...videoForm, [t.id]: { ...form, url: e.target.value } })}
                />
                <Input
                  placeholder="Pontos"
                  aria-label="Pontos do vídeo"
                  inputMode="numeric"
                  value={form.pontos}
                  onChange={(e) => setVideoForm({ ...videoForm, [t.id]: { ...form, pontos: e.target.value } })}
                />
                <Button
                  disabled={form.titulo.trim().length < 2 || form.url.trim().length < 5}
                  onClick={() =>
                    executar(
                      () =>
                        salvarVideo({
                          data: {
                            trilhaId: t.id,
                            titulo: form.titulo.trim(),
                            descricao: null,
                            youtubeUrl: form.url.trim(),
                            ordem: t.videos.length + 1,
                            pontos: Number(form.pontos.replace(/\D/g, "")) || 0,
                          },
                        }).then(() => setVideoForm({ ...videoForm, [t.id]: { titulo: "", url: "", pontos: "10" } })),
                      "Vídeo adicionado.",
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Níveis e medalhas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Níveis</CardTitle>
            <CardDescription>Pontuação mínima de cada faixa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(dados?.niveis ?? []).map((n) => (
              <div key={n.id} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground">{n.nivel}</span>
                <Input
                  className="flex-1"
                  aria-label={`Nome do nível ${n.nivel}`}
                  defaultValue={n.nome}
                  onBlur={(e) =>
                    e.target.value !== n.nome &&
                    executar(
                      () =>
                        salvarNivel({
                          data: {
                            id: n.id,
                            nivel: n.nivel,
                            pontosMinimos: n.pontosMinimos,
                            nome: e.target.value,
                            icone: n.icone,
                          },
                        }),
                      "Nível atualizado.",
                    )
                  }
                />
                <Input
                  className="w-24"
                  aria-label={`Pontos mínimos do nível ${n.nivel}`}
                  inputMode="numeric"
                  defaultValue={String(n.pontosMinimos)}
                  onBlur={(e) => {
                    const pontos = Number(e.target.value.replace(/\D/g, "")) || 0;
                    if (pontos === n.pontosMinimos) return;
                    executar(
                      () =>
                        salvarNivel({
                          data: { id: n.id, nivel: n.nivel, pontosMinimos: pontos, nome: n.nome, icone: n.icone },
                        }),
                      "Nível atualizado.",
                    );
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Medalhas</CardTitle>
            <CardDescription>Entregues automaticamente quando o critério é cumprido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dados?.medalhas ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                <Badge variant="outline">
                  {m.criterioTipo === "trilha"
                    ? "trilha concluída"
                    : m.criterioTipo === "pontos"
                      ? `${m.criterioValor} pontos`
                      : `${m.criterioValor} vídeos`}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remover medalha"
                  onClick={() =>
                    executar(
                      () => excluirItemTreinamento({ data: { id: m.id, tipo: "medalha" } }),
                      "Medalha removida.",
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="grid gap-2 md:grid-cols-[1fr_140px_120px_auto]">
              <Input
                placeholder="Nome da medalha"
                aria-label="Nome da medalha"
                value={medalha.nome}
                onChange={(e) => setMedalha({ ...medalha, nome: e.target.value })}
              />
              <Select
                value={medalha.criterioTipo}
                onValueChange={(v) => setMedalha({ ...medalha, criterioTipo: v as typeof medalha.criterioTipo })}
              >
                <SelectTrigger aria-label="Critério da medalha">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="videos">Nº de vídeos</SelectItem>
                  <SelectItem value="pontos">Pontos</SelectItem>
                  <SelectItem value="trilha">Trilha</SelectItem>
                </SelectContent>
              </Select>
              {medalha.criterioTipo === "trilha" ? (
                <Select
                  value={medalha.criterioValor}
                  onValueChange={(v) => setMedalha({ ...medalha, criterioValor: v })}
                >
                  <SelectTrigger aria-label="Trilha da medalha">
                    <SelectValue placeholder="Trilha" />
                  </SelectTrigger>
                  <SelectContent>
                    {todasTrilhas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  aria-label="Valor do critério"
                  inputMode="numeric"
                  value={medalha.criterioValor}
                  onChange={(e) => setMedalha({ ...medalha, criterioValor: e.target.value })}
                />
              )}
              <Button
                disabled={medalha.nome.trim().length < 2 || !medalha.criterioValor}
                onClick={() =>
                  executar(
                    () =>
                      salvarMedalha({
                        data: {
                          nome: medalha.nome.trim(),
                          descricao: medalha.descricao.trim() || null,
                          icone: medalha.icone,
                          criterioTipo: medalha.criterioTipo,
                          criterioValor: medalha.criterioValor,
                        },
                      }).then(() => setMedalha({ ...medalha, nome: "" })),
                    "Medalha criada.",
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
