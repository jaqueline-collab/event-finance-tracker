import videoAsset from "@/assets/elora-video.mp4.asset.json";
import { Play } from "lucide-react";
import { useRef, useState } from "react";

export function VideoIntro() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.play();
    setPlaying(true);
  };

  return (
    <section className="bg-landing-dark px-6 pb-20 -mt-12">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
          <video
            ref={ref}
            src={videoAsset.url}
            className="w-full h-full object-cover"
            playsInline
            controls={playing}
            preload="metadata"
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <button
              type="button"
              onClick={play}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/40 via-black/20 to-black/60 hover:bg-black/30 transition-colors group"
              aria-label="Reproduzir vídeo"
            >
              <span className="h-20 w-20 rounded-full bg-landing-yellow text-landing-fg flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </span>
              <span className="absolute bottom-6 left-6 text-white/90 text-sm font-medium tracking-wide">
                Conheça o EloraCRM em 2 minutos
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}