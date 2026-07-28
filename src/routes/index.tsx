import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  ArrowUpRight,
  LogIn,
} from "lucide-react";
import { EloraMark } from "@/components/landing/EloraMark";
import { VideoIntro } from "@/components/landing/VideoIntro";
import { Depoimentos } from "@/components/landing/Depoimentos";
import { Parceiros } from "@/components/landing/Parceiros";
import { SistemaTour } from "@/components/landing/SistemaTour";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { Reveal, Typewriter } from "@/components/landing/motion";
import { WHATSAPP_LINK, WHATSAPP_NUMERO, EMAIL_CONTATO } from "@/lib/landing/contato";

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
      { property: "og:url", content: "https://econo-flow-manager.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://econo-flow-manager.lovable.app/" },
    ],
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
      <SistemaTour />
      <Depoimentos />
      <Parceiros />
      <FAQ />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

/* ============================== NAVBAR ============================== */
function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-landing-dark/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 leading-none">
          <EloraMark className="h-7 w-7 text-landing-yellow shrink-0 -mt-0.5" />
          <span
            className="text-white font-bold tracking-tight text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            EloraCRM
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
          <a href="#produto" className="hover:text-landing-yellow transition">
            Produto
          </a>
          <Link to="/simulador" className="hover:text-landing-yellow transition">
            Simulador
          </Link>
          <a href="#parceiros" className="hover:text-landing-yellow transition">
            Parceiros
          </a>
          <a href="#contato" className="hover:text-landing-yellow transition">
            Contato
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://app.eloracrm.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-5 py-2 rounded-md text-sm transition-colors"
          >
            Elora App <ArrowUpRight className="h-4 w-4" />
          </a>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 border border-white/30 hover:border-landing-yellow hover:text-landing-yellow text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors"
          >
            <LogIn className="h-4 w-4" /> Logar
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ============================== HERO ============================== */
function Hero() {
  return (
    <section
      id="top"
      className="relative bg-landing-dark text-white pt-32 pb-24 px-6 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(900px circle at 80% 10%, var(--color-landing-blue) 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, #ffffff 0%, transparent 65%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto text-center">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-landing-yellow border border-landing-yellow/30 rounded-full px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Atendimento + Vendas + IA
        </span>
        <h1
          className="mt-6 text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Para as conversas e o negócio
          <br />
          <Typewriter
            className="text-landing-yellow"
            frases={[
              "andarem juntos.",
              "venderem mais.",
              "responderem na hora.",
            ]}
          />
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
          Centralize WhatsApp, Instagram e Messenger em uma plataforma com CRM,
          chatbot, disparo e agentes de IA. Tudo num só lugar.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/simulador"
            className="bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-7 py-3.5 rounded-md text-base transition-colors inline-flex items-center gap-2"
          >
            Simular meu plano <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://app.eloracrm.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-md text-base transition-colors"
          >
            Elora App <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================== FAQ ============================== */
const FAQS = [
  {
    q: "Qual a diferença entre WhatsApp Oficial e Não-Oficial?",
    a: "WhatsApp Oficial usa a API da Meta — mais estável, com selo verde e suporte a templates pagos. O Não-Oficial usa integração via Z-API, mais barato e com menos restrições de envio.",
  },
  {
    q: "Quanto tempo leva a implantação?",
    a: "Em média, de 5 a 10 dias úteis, dependendo da maturidade da operação e das integrações necessárias.",
  },
  {
    q: "Vocês integram com meu sistema atual?",
    a: "Sim. Suportamos integrações via webhooks e API, incluindo CRMs, ERPs e plataformas de pagamento como ASAAS.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Todos os planos têm suporte por chat. Escala e Corporativo recebem suporte prioritário e SLA dedicado.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim, a qualquer momento — para cima ou para baixo. Cobramos proporcionalmente no próximo ciclo.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Sem fidelidade. Você pode cancelar quando quiser, mantendo acesso até o fim do ciclo já pago.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Perguntas frequentes
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tira-dúvidas
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const aberto = open === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-landing-border bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(aberto ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-landing-surface transition-colors"
                >
                  <span className="font-medium text-landing-fg">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-landing-muted shrink-0 transition-transform ${
                      aberto ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {aberto && (
                  <div className="px-5 pb-5 text-sm text-landing-muted leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================== FOOTER ============================== */
function Footer() {
  return (
    <footer id="contato" className="bg-landing-dark-2 text-white/80 py-14 px-6 border-t border-white/10">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 leading-none">
            <EloraMark className="h-7 w-7 text-landing-yellow shrink-0" />
            <span
              className="text-white font-bold tracking-tight text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EloraCRM
            </span>
          </div>
          <p className="text-sm text-white/60 mt-3 max-w-xs">
            Para as conversas e o negócio andarem juntos.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow">
            Navegação
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#produto" className="hover:text-white">Produto</a></li>
            <li><Link to="/simulador" className="hover:text-white">Simulador</Link></li>
            <li><a href="#parceiros" className="hover:text-white">Parceiros</a></li>
            <li>
              <a
                href="https://app.eloracrm.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white inline-flex items-center gap-1"
              >
                Elora App <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <Link to="/auth" className="hover:text-white">
                Área do parceiro
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow">
            Contato
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {EMAIL_CONTATO}</li>
            <li>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white"
              >
                <Phone className="h-4 w-4" /> {WHATSAPP_NUMERO}
              </a>
            </li>
            <li className="flex items-center gap-2"><Globe className="h-4 w-4" /> app.eloracrm.com.br</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 text-xs text-white/40 text-center">
        © {new Date().getFullYear()} EloraCRM. Todos os direitos reservados.
      </div>
    </footer>
  );
}