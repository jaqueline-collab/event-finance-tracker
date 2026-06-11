import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageCircle,
  Bot,
  Send,
  Users,
  Sparkles,
  BarChart3,
  Check,
  ChevronDown,
  Mail,
  Phone,
  Globe,
  ArrowRight,
} from "lucide-react";
import { PLANOS_VITRINE } from "@/lib/landing/precos-vitrine";
import { formatBRL } from "@/lib/calc/format";
import { Simulador } from "@/components/landing/Simulador";

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
          offers: PLANOS_VITRINE.map((p) => ({
            "@type": "Offer",
            name: p.nome,
            price: p.mensal,
            priceCurrency: "BRL",
          })),
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
      <Stats />
      <Funcionalidades />
      <Onboarding />
      <Planos />
      <Simulador />
      <FAQ />
      <CTAFinal />
      <Footer />
    </div>
  );
}

/* ============================== NAVBAR ============================== */
function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-landing-dark/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-landing-yellow flex items-center justify-center font-bold text-landing-fg">
            e
          </div>
          <span
            className="text-white font-bold tracking-tight text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            EloraCRM
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
          <a href="#funcionalidades" className="hover:text-landing-yellow transition">
            Funcionalidades
          </a>
          <a href="#planos" className="hover:text-landing-yellow transition">
            Planos
          </a>
          <a href="#simulador" className="hover:text-landing-yellow transition">
            Simulador
          </a>
          <a href="#contato" className="hover:text-landing-yellow transition">
            Contato
          </a>
        </nav>
        <a
          href="/auth"
          className="bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-5 py-2 rounded-md text-sm transition-colors"
        >
          Entrar
        </a>
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
            "radial-gradient(900px circle at 80% 10%, var(--color-landing-blue) 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, var(--color-landing-yellow) 0%, transparent 50%)",
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
          Para as conversas e o<br />
          negócio <span className="text-landing-yellow">andarem juntos.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
          Centralize WhatsApp, Instagram e Messenger em uma plataforma com CRM,
          chatbot, disparo e agentes de IA. Tudo num só lugar.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#simulador"
            className="bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-7 py-3.5 rounded-md text-base transition-colors inline-flex items-center gap-2"
          >
            Simular meu plano <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/auth"
            className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-md text-base transition-colors"
          >
            Entrar
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================== STATS ============================== */
const STATS = [
  { pct: "97%", text: "afirmam acessar o WhatsApp ao menos uma vez ao dia." },
  { pct: "82%", text: "já se comunicam com marcas via WhatsApp." },
  { pct: "75%", text: "já contrataram serviços pelo app." },
  { pct: "70%", text: "das empresas usam WhatsApp em marketing." },
  { pct: "67%", text: "do comércio usa WhatsApp como canal primário." },
];

function Stats() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Dados de mercado
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            O WhatsApp já é onde seu cliente está
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-landing-border p-6 hover:border-landing-blue transition-colors"
            >
              <div
                className="text-4xl font-bold text-landing-blue"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.pct}
              </div>
              <p className="text-sm text-landing-muted mt-2 leading-snug">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-landing-muted text-center mt-6">
          Fontes: Opinion Box, Hazlo, CNN Brasil.
        </p>
      </div>
    </section>
  );
}

/* ============================== FUNCIONALIDADES ============================== */
const FEATURES = [
  {
    icon: MessageCircle,
    title: "Central de Atendimento",
    desc: "WhatsApp, Instagram e Messenger integrados. Etiquetas, distribuição automática e CRM dentro da conversa.",
  },
  {
    icon: Bot,
    title: "Chatbot",
    desc: "Crie fluxos para diferentes cenários. Qualifica leads, agenda horários e responde perguntas frequentes.",
  },
  {
    icon: Send,
    title: "Disparo de Mensagens",
    desc: "Campanhas de marketing por WhatsApp com alta taxa de leitura. Promoções, lançamentos e carrinho abandonado.",
  },
  {
    icon: Users,
    title: "CRM",
    desc: "Gerencie clientes com segmentação inteligente e jornada mapeada. Tudo baseado em conversas reais.",
  },
  {
    icon: Sparkles,
    title: "Agentes Inteligentes",
    desc: "Assistentes virtuais com IA que entendem, interagem e resolvem solicitações com tom humanizado.",
    badge: "BETA",
  },
  {
    icon: BarChart3,
    title: "Rastreabilidade",
    desc: "Atribua a origem de cada lead, acompanhe a navegação e meça a conversão de cada campanha.",
  },
];

function Funcionalidades() {
  return (
    <section id="funcionalidades" className="py-20 px-6 bg-landing-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Funcionalidades
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Uma plataforma completa
          </h2>
          <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
            Atendimento, vendas e automação em um só lugar.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white border border-landing-border p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-landing-blue/10 text-landing-blue flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h3
                  className="text-xl font-bold text-landing-fg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                {f.badge && (
                  <span className="text-[10px] font-bold bg-landing-yellow text-landing-fg px-1.5 py-0.5 rounded">
                    {f.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-landing-muted mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== ONBOARDING ============================== */
const STEPS = [
  { n: "01", title: "Kick-Off", desc: "Alinhamento dos próximos passos e maturidade." },
  { n: "02", title: "Configurações", desc: "Criamos sua conta e conectamos os canais." },
  { n: "03", title: "Conexões", desc: "Integrações com seus números e redes sociais." },
  { n: "04", title: "Treinamento", desc: "Capacitação prática para a equipe usar bem." },
  { n: "05", title: "Tira-dúvidas", desc: "Espaço aberto para resolver desafios reais." },
];

function Onboarding() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Implantação
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Fluxo de onboarding
          </h2>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-landing-border p-5 bg-white relative"
            >
              <div
                className="text-3xl font-bold text-landing-yellow"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.n}
              </div>
              <div className="text-base font-bold text-landing-fg mt-2">{s.title}</div>
              <p className="text-xs text-landing-muted mt-1 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== PLANOS ============================== */
function Planos() {
  return (
    <section id="planos" className="py-20 px-6 bg-landing-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Planos
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Escolha o ideal para você
          </h2>
          <p className="text-landing-muted mt-3">
            Comece pelo essencial. Escale quando quiser.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANOS_VITRINE.map((p) => {
            const destaque = p.destaque;
            return (
              <div
                key={p.key}
                className={`rounded-2xl p-7 border-2 transition-all flex flex-col ${
                  destaque
                    ? "bg-landing-dark text-white border-landing-yellow shadow-xl md:-translate-y-3"
                    : "bg-white text-landing-fg border-landing-border"
                }`}
              >
                {destaque && (
                  <div className="inline-block self-start bg-landing-yellow text-landing-fg text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded mb-3">
                    Mais escolhido
                  </div>
                )}
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.nome}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${destaque ? "text-landing-yellow" : "text-landing-blue"}`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatBRL(p.mensal)}
                  </span>
                  <span className={destaque ? "text-white/60 text-sm" : "text-landing-muted text-sm"}>
                    /mês
                  </span>
                </div>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          destaque ? "text-landing-yellow" : "text-landing-blue"
                        }`}
                      />
                      <span className={destaque ? "text-white/90" : "text-landing-fg"}>{r}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#simulador"
                  className={`mt-7 block text-center font-semibold rounded-md py-3 transition-colors ${
                    destaque
                      ? "bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg"
                      : "bg-landing-fg hover:bg-landing-dark-2 text-white"
                  }`}
                >
                  Simular este plano
                </a>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-landing-muted text-center mt-6">
          Taxa de implantação sob consulta. Adicionais cobrados à parte.
        </p>
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

/* ============================== CTA FINAL ============================== */
function CTAFinal() {
  return (
    <section className="py-20 px-6 bg-landing-dark text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="text-4xl md:text-5xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pronto para colocar seu atendimento <span className="text-landing-yellow">no automático?</span>
        </h2>
        <p className="text-white/70 mt-4">
          Centralize canais, qualifique leads e venda mais — sem trocar de aba.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#simulador"
            className="bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-7 py-3.5 rounded-md transition-colors"
          >
            Simular meu plano
          </a>
          <a
            href="/auth"
            className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-md transition-colors"
          >
            Entrar
          </a>
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-landing-yellow flex items-center justify-center font-bold text-landing-fg">
              e
            </div>
            <span
              className="text-white font-bold tracking-tight text-lg"
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
            <li><a href="#funcionalidades" className="hover:text-white">Funcionalidades</a></li>
            <li><a href="#planos" className="hover:text-white">Planos</a></li>
            <li><a href="#simulador" className="hover:text-white">Simulador</a></li>
            <li><a href="/auth" className="hover:text-white">Entrar</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow">
            Contato
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contato@eloracrm.com</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> (21) 99550-1331</li>
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