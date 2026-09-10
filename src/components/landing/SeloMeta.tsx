import { ShieldCheck } from "lucide-react";
import selo from "@/assets/meta-business-partner.png.asset.json";

/** Faixa de credibilidade com o selo oficial Meta Business Partner. */
export function SeloMeta() {
  return (
    <section className="bg-white border-t border-landing-border py-10 px-6">
      <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-[auto_1fr] items-center">
        <img
          src={selo.url}
          alt="Selo Meta Business Partner"
          className="h-20 w-auto mx-auto sm:mx-0 shrink-0"
          loading="lazy"
        />
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rabbit-navy">
            <ShieldCheck className="h-4 w-4" /> Parceiro oficial Meta
          </div>
          <p className="text-landing-muted mt-2 max-w-xl">
            Somos <span className="text-landing-fg font-semibold">Meta Business Partner</span>:
            WhatsApp Oficial, Instagram e Messenger conectados com estabilidade, suporte e
            conformidade com as regras da Meta.
          </p>
        </div>
      </div>
    </section>
  );
}
