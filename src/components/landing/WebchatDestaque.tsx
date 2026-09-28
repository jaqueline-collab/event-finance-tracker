import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Send } from "lucide-react";
import { Reveal } from "@/components/landing/motion";
import { CHAT_LINK } from "@/lib/landing/contato";
import { SLUG_WEBCHAT } from "@/lib/landing/post-webchat";

const NUMEROS = [
  { valor: "R$ 0", legenda: "em tarifa Meta por mensagem" },
  { valor: "2 canais", legenda: "por conta" },
  { valor: "50 MB", legenda: "por arquivo" },
  { valor: "30 dias", legenda: "de sessão salva" },
];

export function WebchatDestaque() {
  return (
    <section className="bg-rabbit-navy text-white px-5 sm:px-6 py-14 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] items-center">
        <Reveal>
          <span className="inline-block rounded-full bg-landing-yellow-vivo px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-landing-fg">
            Novidade
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Conheça o WebChat: atenda pelo link ou QR Code,{" "}
            <span className="text-landing-yellow-vivo">sem custo por mensagem da Meta</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-white/75 max-w-2xl">
            O novo canal do Elora CRM para o seu cliente falar com você direto do navegador. Sem aplicativo, sem número de
            WhatsApp e com tudo centralizado na mesma plataforma.
          </p>
          <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {NUMEROS.map((n) => (
              <div key={n.valor}>
                <dt className="text-2xl sm:text-3xl font-bold text-landing-yellow-vivo">{n.valor}</dt>
                <dd className="mt-1 text-sm text-white/65">{n.legenda}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/blog/$slug" params={{ slug: SLUG_WEBCHAT }}
              className="inline-flex items-center gap-1.5 rounded-md bg-landing-yellow-vivo hover:bg-landing-yellow px-6 py-3.5 font-semibold text-landing-fg transition-colors"
            >
              Ler o guia completo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={CHAT_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/60 hover:border-landing-yellow-vivo hover:text-landing-yellow-vivo px-6 py-3.5 font-semibold text-white transition-colors"
            >
              Quero ativar o WebChat <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div aria-hidden className="mx-auto w-full max-w-sm rounded-2xl bg-white text-landing-fg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 bg-rabbit-navy-light px-4 py-3 text-white">
              <span className="h-9 w-9 rounded-full bg-landing-yellow-vivo" />
              <div>
                <p className="text-sm font-semibold">Atendimento</p>
                <p className="flex items-center gap-1.5 text-xs text-white/75">
                  <span className="h-2 w-2 rounded-full bg-landing-yellow-vivo" /> Online
                </p>
              </div>
            </div>
            <div className="space-y-3 p-4 min-h-44 bg-landing-surface">
              <p className="w-fit max-w-[80%] rounded-2xl rounded-tl-sm bg-white border border-landing-border px-4 py-2.5 text-sm">
                Vamos conversar
              </p>
            </div>
            <div className="flex items-center gap-2 border-t border-landing-border p-3">
              <span className="flex-1 rounded-full border border-landing-border px-4 py-2 text-sm text-landing-muted">Digite aqui...</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rabbit-navy text-white">
                <Send className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
