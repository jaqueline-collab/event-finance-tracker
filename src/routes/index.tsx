import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowUpRight, LogIn, ArrowRight } from "lucide-react";
import { Navbar, Footer } from "@/components/landing/SiteChrome";
import { VideoIntro } from "@/components/landing/VideoIntro";
import { SistemaTour } from "@/components/landing/SistemaTour";
import { SeloMeta } from "@/components/landing/SeloMeta";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { FaqLista } from "@/components/landing/FaqLista";
import { Reveal, Typewriter } from "@/components/landing/motion";
import { BlogCard } from "@/components/landing/BlogCard";
import { FAQS } from "@/lib/landing/faqs";
import { POSTS } from "@/lib/landing/posts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EloraCRM — WhatsApp, Instagram e Messenger em um só lugar" },
      {
        name: "description",
        content:
          "CRM com atendimento omnichannel, chatbot, disparo de mensagens e agentes de IA para WhatsApp, Instagram e Messenger.",
      },
      { property: "og:title", content: "EloraCRM — Atendimento, Vendas e Automação" },
      {
        property: "og:description",
        content:
          "Plataforma completa para conversar com clientes e fechar vendas. Central de atendimento, chatbot, disparo e agentes de IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://econo-flow-manager.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://econo-flow-manager.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "EloraCRM",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />
      <Hero />
      <VideoIntro />
      <SeloMeta />
      <SistemaTour />
      <DoBlog />
      <FaqResumo />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

/* ============================== HERO ============================== */
function Hero() {
  return (
    <section
      id="top"
      className="relative bg-landing-dark text-white pt-28 pb-24 md:pt-32 md:pb-32 px-6 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(900px circle at 80% 10%, #1e3a5f 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, #2a4a73 0%, transparent 65%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-landing-yellow-vivo border border-landing-yellow-vivo/30 rounded-full px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Atendimento + Vendas + IA
          </span>
          <h1
            className="mt-6 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Para as conversas e o negócio
            <br />
            <Typewriter
              className="text-landing-yellow-vivo"
              frases={["andarem juntos.", "venderem mais.", "responderem na hora."]}
            />
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Centralize WhatsApp, Instagram e Messenger em uma plataforma com CRM, chatbot,
            disparo e agentes de IA. Tudo num só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://app.eloracrm.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-7 py-3.5 rounded-md text-base transition-colors"
            >
              Elora App <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 border border-white/30 hover:border-landing-yellow-vivo hover:text-landing-yellow-vivo text-white font-semibold px-6 py-3.5 rounded-md text-base transition-colors"
            >
              <LogIn className="h-4 w-4" /> Logar
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================== DO BLOG ============================== */
function DoBlog() {
  return (
    <section className="py-20 md:py-24 px-6 bg-landing-surface border-t border-landing-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-rabbit-navy">
              Conteúdo
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Do blog
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 bg-rabbit-navy hover:bg-rabbit-navy/90 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
          >
            Ver todos os artigos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {POSTS.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 90}>
              <BlogCard post={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== FAQ RESUMO ============================== */
function FaqResumo() {
  return (
    <section className="py-20 md:py-24 px-6 bg-white border-t border-landing-border">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        <Reveal>
          <span className="text-xs font-semibold tracking-widest uppercase text-rabbit-navy">
            Perguntas frequentes
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tira-dúvidas
          </h2>
          <p className="text-landing-muted mt-4 max-w-md">
            As dúvidas mais comuns de quem está começando com o EloraCRM.
          </p>
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 mt-6 bg-rabbit-navy hover:bg-rabbit-navy/90 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
          >
            Ver todas as perguntas <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={120}>
          <FaqLista itens={FAQS.slice(0, 3)} inicial={0} />
        </Reveal>
      </div>
    </section>
  );
}
