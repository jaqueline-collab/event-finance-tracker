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
    <section className="bg-landing-dark px-6 pb-20 -mt-12">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
          <video
            ref={ref}
            src={videoAsset.url}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            controls
            preload="metadata"
          />
          <button
            type="button"
            onClick={toggleMute}
            className="absolute top-4 right-4 inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm transition-colors"
            aria-label={muted ? "Ativar som" : "Desativar som"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
