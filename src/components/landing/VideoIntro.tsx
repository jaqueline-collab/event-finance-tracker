import videoAsset from "@/assets/elora-video.mp4.asset.json";
import { Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";

export function VideoIntro() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section className="bg-landing-dark px-4 sm:px-6 pb-10 sm:pb-16 lg:pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
          <video
            ref={ref}
            src={videoAsset.url}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            preload="metadata"
          />
          <button
            type="button"
            onClick={toggleMute}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center justify-center h-10 w-10 rounded-full bg-landing-dark/90 hover:bg-landing-dark text-white border border-white/30 backdrop-blur-sm transition-colors"
            aria-label={muted ? "Ativar som" : "Desativar som"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
