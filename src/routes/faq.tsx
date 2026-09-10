import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, X } from "lucide-react";
import { Navbar, Footer } from "@/components/landing/SiteChrome";
import { FaqLista, normalizar } from "@/components/landing/FaqLista";
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
      { property: "og:url", content: "https://eloracrm.com.br/faq" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://eloracrm.com.br/faq" }],
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
  const [busca, setBusca] = useState("");
  const termo = busca.trim();

  const filtrados = useMemo(() => {
    const t = normalizar(termo);
    if (!t) return FAQS;
    return FAQS.filter((f) => normalizar(`${f.q} ${f.a}`).includes(t));
  }, [termo]);

  const buscando = termo.length > 0;
  const metade = Math.ceil(filtrados.length / 2);

  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />

      <PageHeader
        etiqueta="Tira-dúvidas"
        titulo="Perguntas frequentes"
        descricao="Tudo o que você precisa saber para começar a vender mais com o EloraCRM."
      >
        <>
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por palavra: cancelar, suporte, WhatsApp..."
              aria-label="Buscar nas perguntas frequentes"
              className="w-full rounded-full bg-white/10 border border-white/20 pl-12 pr-11 py-3.5 text-white placeholder:text-white/40 outline-none focus:border-landing-yellow-vivo transition-colors"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {buscando && (
            <p className="mt-4 text-sm text-white/60">
              {filtrados.length === 0
                ? "Nenhuma pergunta encontrada"
                : `${filtrados.length} pergunta${filtrados.length > 1 ? "s" : ""} encontrada${
                    filtrados.length > 1 ? "s" : ""
                  }`}
            </p>
          )}
        </>
      </PageHeader>


      <section className="py-16 md:py-20 px-6 bg-white">
        {filtrados.length === 0 ? (
          <div className="max-w-xl mx-auto text-center">
            <p className="text-landing-muted">
              Não achamos nada com “{termo}”. Fale com a gente que respondemos na hora.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Falar no WhatsApp <ArrowUpRight className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setBusca("")}
                className="inline-flex items-center gap-1.5 border border-landing-border hover:border-rabbit-navy text-landing-fg font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Limpar busca
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8 items-start">
            <Reveal>
              <FaqLista
                itens={filtrados.slice(0, metade)}
                inicial={0}
                {...(buscando ? { termo } : {})}
              />
            </Reveal>
            <Reveal delay={120}>
              {filtrados.length > 1 && (
                <FaqLista itens={filtrados.slice(metade)} {...(buscando ? { termo } : {})} />
              )}
            </Reveal>
          </div>
        )}

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
