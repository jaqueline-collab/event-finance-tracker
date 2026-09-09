import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Navbar, Footer } from "@/components/landing/SiteChrome";
import { FaqLista } from "@/components/landing/FaqLista";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { Reveal } from "@/components/landing/motion";
import { FAQS } from "@/lib/landing/faqs";
import { WHATSAPP_LINK } from "@/lib/landing/contato";

const TITULO = "Perguntas frequentes — EloraCRM";
const DESC =
  "Tire suas dúvidas sobre o EloraCRM: WhatsApp oficial e não-oficial, implantação, integrações, planos, suporte e agentes de IA.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://eloracrm.lovable.app/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const metade = Math.ceil(FAQS.length / 2);
  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />

      <section className="relative bg-landing-dark text-white pt-28 pb-16 md:pt-32 md:pb-20 px-6 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(900px circle at 80% 10%, #1e3a5f 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, #2a4a73 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-yellow-vivo">
            Tira-dúvidas
          </span>
          <h1
            className="mt-3 text-4xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Perguntas frequentes
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto">
            Tudo o que você precisa saber para começar a vender mais com o EloraCRM.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8 items-start">
          <Reveal>
            <FaqLista itens={FAQS.slice(0, metade)} inicial={0} />
          </Reveal>
          <Reveal delay={120}>
            <FaqLista itens={FAQS.slice(metade)} />
          </Reveal>
        </div>

        <div className="max-w-6xl mx-auto mt-14 rounded-2xl bg-landing-dark text-white p-8 md:p-10 text-center">
          <h2
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ficou com outra dúvida?
          </h2>
          <p className="text-white/70 mt-3">Fale com a gente no WhatsApp e a gente te responde.</p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-6 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-7 py-3 rounded-md transition-colors"
          >
            Falar no WhatsApp <ArrowUpRight className="h-4 w-4" />
          </a>
          <div className="mt-4">
            <Link to="/" className="text-sm text-white/60 hover:text-white underline">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
