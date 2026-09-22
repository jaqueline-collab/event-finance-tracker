import { useEffect, useRef, useState } from "react";

/**
 * Player do YouTube com detecção de fim do vídeo.
 *
 * Usa a IFrame API pública (sem login). Se o navegador bloquear os eventos,
 * o componente avisa quando passa de 90% assistido para liberar o botão manual.
 */

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;

function carregarApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("sem-janela"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function PlayerYoutube({
  youtubeId,
  onFim,
  onQuaseFim,
}: {
  youtubeId: string;
  onFim: () => void;
  onQuaseFim: () => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const player = useRef<any>(null);
  const [pronto, setPronto] = useState(false);
  const fimRef = useRef(onFim);
  const quaseRef = useRef(onQuaseFim);
  fimRef.current = onFim;
  quaseRef.current = onQuaseFim;

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    carregarApi()
      .then((YT) => {
        if (!vivo || !container.current) return;
        player.current = new YT.Player(container.current, {
          videoId: youtubeId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => setPronto(true),
            onStateChange: (e: any) => {
              if (e.data === YT.PlayerState.ENDED) fimRef.current();
            },
          },
        });
        // Fallback: acompanha o tempo assistido para liberar o botão manual.
        timer = setInterval(() => {
          const p = player.current;
          if (!p?.getDuration) return;
          const total = p.getDuration();
          const atual = p.getCurrentTime?.() ?? 0;
          if (total > 0 && atual / total >= 0.9) quaseRef.current();
        }, 2000);
      })
      .catch(() => setPronto(false));

    return () => {
      vivo = false;
      if (timer) clearInterval(timer);
      try {
        player.current?.destroy?.();
      } catch {
        /* ignora */
      }
      player.current = null;
    };
  }, [youtubeId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
      <div ref={container} className="h-full w-full" />
      {!pronto ? (
        <span className="sr-only">Carregando vídeo…</span>
      ) : null}
    </div>
  );
}
