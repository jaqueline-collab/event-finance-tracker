import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, CheckCircle2, Lock, Play, PartyPopper, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerYoutube } from "@/components/treinamento/player-youtube";
import { concluirVideo, getTreinamento } from "@/lib/treinamento.functions";
import { videoLiberado, type Trilha } from "@/lib/treinamento";

type Dados = Awaited<ReturnType<typeof getTreinamento>>;

/** Tela de Treinamento usada na Área do Parceiro e na Área do Cliente. */
export function PainelTreinamento({ audiencia }: { audiencia?: "parceiro" | "cliente" }) {
  const carregar = useServerFn(getTreinamento);
  const concluir = useServerFn(concluirVideo);

  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [trilhaAberta, setTrilhaAberta] = useState<string | null>(null);
  const [videoSelecionado, setVideoSelecionado] = useState<string | null>(null);
  const [quaseFim, setQuaseFim] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [celebracao, setCelebracao] = useState<{ titulo: string; texto: string } | null>(null);

  const buscar = () => {
    setCarregando(true);
    setErro(null);
    carregar({ data: audiencia ? { audiencia } : {} })
      .then((d) => setDados(d as Dados))
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  };

  useEffect(buscar, [audiencia]);

  const concluidos = useMemo(() => new Set(dados?.concluidos ?? []), [dados]);
  const trilhas = (dados?.trilhas ?? []) as Trilha[];
  const trilha = trilhas.find((t) => t.id === trilhaAberta) ?? trilhas[0] ?? null;
  const video =
    trilha?.videos.find((v) => v.id === videoSelecionado) ??
    trilha?.videos.find((v) => !concluidos.has(v.id)) ??
    trilha?.videos[0] ??
    null;
  const liberado = trilha && video ? videoLiberado(trilha, video.id, concluidos) : false;
  const jaConcluido = video ? concluidos.has(video.id) : false;

  const marcarConcluido = async () => {
    if (!video || salvando) return;
    setSalvando(true);
    try {
      const r = await concluir({ data: { videoId: video.id } });
      if (r.novasMedalhas.length > 0) {
        setCelebracao({
          titulo: "Nova medalha!",
          texto: r.novasMedalhas.map((m) => m.nome).join(", "),
        });
      } else if (r.subiuDeNivel && r.nivel) {
        setCelebracao({ titulo: "Novo nível!", texto: `Você chegou a ${r.nivel.nome}.` });
      } else {
        toast.success("Vídeo concluído.");
      }
      setQuaseFim(false);
      setVideoSelecionado(null);
      buscar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível registrar a conclusão.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treinamento indisponível</CardTitle>
          <CardDescription>{erro}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const medalhas = dados?.medalhas ?? [];
  const conquistadas = medalhas.filter((m) => m.conquistada);

  return (
    <div className="space-y-4">
      {/* Progresso do próprio usuário — nunca comparado com outras pessoas. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold leading-none">{dados?.pontos ?? 0}</p>
              <p className="text-xs text-muted-foreground">pontos</p>
            </div>
          </div>
          <div className="border-l pl-4">
            <p className="text-sm font-medium">{dados?.nivel?.nome ?? "Iniciante"}</p>
            <p className="text-xs text-muted-foreground">seu nível</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-sm font-medium">{conquistadas.length} de {medalhas.length}</p>
            <p className="text-xs text-muted-foreground">medalhas</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1">
            {conquistadas.map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1">
                <Award className="h-3 w-3" /> {m.nome}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {trilhas.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhuma trilha disponível ainda</CardTitle>
            <CardDescription>Assim que o time publicar um treinamento, ele aparece aqui.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {trilhas.map((t) => {
              const feitos = t.videos.filter((v) => concluidos.has(v.id)).length;
              const pct = t.videos.length ? (feitos / t.videos.length) * 100 : 0;
              const ativa = t.id === trilha?.id;
              return (
                <Card
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={ativa}
                  onClick={() => {
                    setTrilhaAberta(t.id);
                    setVideoSelecionado(null);
                    setQuaseFim(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setTrilhaAberta(t.id);
                      setVideoSelecionado(null);
                    }
                  }}
                  className={ativa ? "cursor-pointer border-primary" : "cursor-pointer"}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.titulo}</CardTitle>
                    {t.descricao ? <CardDescription>{t.descricao}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <Progress value={pct} />
                    <p className="text-xs text-muted-foreground">
                      {feitos} de {t.videos.length} vídeos concluídos
                      {t.pontosBonusConclusao ? ` · bônus de ${t.pontosBonusConclusao} pontos` : ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            {trilha && video ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{video.titulo}</CardTitle>
                  {video.descricao ? <CardDescription>{video.descricao}</CardDescription> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {liberado ? (
                    <PlayerYoutube
                      youtubeId={video.youtubeId}
                      onFim={marcarConcluido}
                      onQuaseFim={() => setQuaseFim(true)}
                    />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
                      <Lock className="h-6 w-6" />
                      <p className="text-sm">Conclua o vídeo anterior para liberar este.</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{video.pontos} pontos</Badge>
                    {jaConcluido ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Concluído
                      </Badge>
                    ) : null}
                    {liberado && !jaConcluido && quaseFim ? (
                      <Button size="sm" onClick={marcarConcluido} disabled={salvando}>
                        Marcar como concluído
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {trilha ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vídeos da trilha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pb-4">
                  {trilha.videos.map((v) => {
                    const ok = concluidos.has(v.id);
                    const podeVer = videoLiberado(trilha, v.id, concluidos);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!podeVer}
                        onClick={() => {
                          setVideoSelecionado(v.id);
                          setQuaseFim(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ok ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : podeVer ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span className="flex-1">{v.titulo}</span>
                        <span className="text-xs text-muted-foreground">{v.pontos} pts</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={Boolean(celebracao)} onOpenChange={(o) => !o && setCelebracao(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" /> {celebracao?.titulo}
            </DialogTitle>
            <DialogDescription>{celebracao?.texto}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setCelebracao(null)}>Continuar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
