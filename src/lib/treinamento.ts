/**
 * Regras puras do Treinamento (LMS): ordem dos vídeos, pontos, níveis e medalhas.
 *
 * Isolado aqui para ser testável e para que servidor e interface usem exatamente
 * o mesmo cálculo. Nada de acesso a banco neste arquivo.
 */

export type VideoTrilha = {
  id: string;
  titulo: string;
  descricao: string | null;
  youtubeId: string;
  youtubeUrl: string;
  ordem: number;
  pontos: number;
};

export type Trilha = {
  id: string;
  titulo: string;
  descricao: string | null;
  audiencia: "parceiro" | "cliente";
  ativa: boolean;
  pontosBonusConclusao: number;
  ordem: number;
  videos: VideoTrilha[];
};

export type NivelGamificacao = {
  nivel: number;
  pontosMinimos: number;
  nome: string;
  icone: string | null;
};

export type Medalha = {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  criterioTipo: "trilha" | "pontos" | "videos";
  /** id da trilha (tipo trilha) ou número em texto (pontos/vídeos). */
  criterioValor: string;
};

/** Extrai o id do vídeo de qualquer formato de link do YouTube. */
export function extrairYoutubeId(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (/^[\w-]{11}$/.test(v)) return v;
  const padroes = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of padroes) {
    const m = v.match(p);
    if (m) return m[1];
  }
  return null;
}

const ordenar = (videos: VideoTrilha[]) => [...videos].sort((a, b) => a.ordem - b.ordem);

/**
 * Um vídeo só está liberado quando é o primeiro da trilha ou quando o anterior
 * já foi concluído. Usado tanto na tela quanto na validação do servidor.
 */
export function videoLiberado(trilha: Trilha, videoId: string, concluidos: Set<string>): boolean {
  const lista = ordenar(trilha.videos);
  const idx = lista.findIndex((v) => v.id === videoId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return concluidos.has(lista[idx - 1].id);
}

/** Índice do próximo vídeo a assistir (o primeiro não concluído). */
export function videoAtual(trilha: Trilha, concluidos: Set<string>): VideoTrilha | null {
  const lista = ordenar(trilha.videos);
  return lista.find((v) => !concluidos.has(v.id)) ?? lista[lista.length - 1] ?? null;
}

export function trilhaConcluida(trilha: Trilha, concluidos: Set<string>): boolean {
  return trilha.videos.length > 0 && trilha.videos.every((v) => concluidos.has(v.id));
}

/** Pontos dos vídeos concluídos + bônus das trilhas inteiras. */
export function calcularPontos(trilhas: Trilha[], concluidos: Set<string>): number {
  let total = 0;
  for (const t of trilhas) {
    for (const v of t.videos) if (concluidos.has(v.id)) total += v.pontos;
    if (trilhaConcluida(t, concluidos)) total += t.pontosBonusConclusao;
  }
  return total;
}

/** Nível correspondente à pontuação — a maior faixa já alcançada. */
export function nivelPara(pontos: number, niveis: NivelGamificacao[]): NivelGamificacao | null {
  const ordenados = [...niveis].sort((a, b) => a.pontosMinimos - b.pontosMinimos);
  let atual: NivelGamificacao | null = null;
  for (const n of ordenados) if (pontos >= n.pontosMinimos) atual = n;
  return atual;
}

/** Medalhas cujo critério já foi cumprido, segundo o progresso informado. */
export function medalhasElegiveis(
  medalhas: Medalha[],
  estado: { pontos: number; videosConcluidos: number; trilhasConcluidas: Set<string> },
): Medalha[] {
  return medalhas.filter((m) => {
    if (m.criterioTipo === "trilha") return estado.trilhasConcluidas.has(m.criterioValor);
    const alvo = Number(m.criterioValor);
    if (!Number.isFinite(alvo)) return false;
    if (m.criterioTipo === "pontos") return estado.pontos >= alvo;
    return estado.videosConcluidos >= alvo;
  });
}
