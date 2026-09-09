import {
  Instagram,
  Globe,
  ArrowRight,
  Users,
  Target,
  MessageCircle,
  BarChart3,
  Workflow,
  Hand,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "./motion";
import pauloCoelho from "@/assets/paulo-coelho-rabbit.png.asset.json";

const PILLARS = [
  {
    icon: Hand,
    title: "Treinamento 6 mãos",
    desc: "Metodologia própria que alinha estratégia, copy, criativo, tráfego, SDR e CRM em um único fluxo de trabalho.",
  },
  {
    icon: Target,
    title: "SDR dedicado",
    desc: "Especialista exclusivo para qualificar leads, responder rápido e nutrir até a consulta agendada.",
  },
  {
    icon: MessageCircle,
    title: "Social Seller",
    desc: "Vendas via redes sociais e WhatsApp com abordagem humanizada e escala automatizada.",
  },
];

const PIPELINE = [
  {
    step: "01",
    title: "Demanda",
    desc: "A Rabbit cria campanhas e atrai leads qualificados para clínicas, consultórios e negócios de saúde.",
  },
  {
    step: "02",
    title: "Central Elora",
    desc: "Leads entram no WhatsApp, Instagram e Messenger unificados no EloraCRM.",
  },
  {
    step: "03",
    title: "Qualificação",
    desc: "SDR e cadências automáticas classificam, seguem e convertem contatos em consultas agendadas.",
  },
  {
    step: "04",
    title: "Retorno",
    desc: "O CRM acompanha o paciente do primeiro atendimento ao retorno, maximizando o LTV.",
  },
];

export function Parceiros() {
  return (
    <section id="parceiros" className="bg-rabbit-black text-rabbit-white">
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(800px circle at 70% 20%, #1e3a5f 0%, transparent 55%), radial-gradient(500px circle at 20% 80%, #2a4a73 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rabbit-white/80 border border-rabbit-white/20 rounded-full px-4 py-1.5">
                Parceiro oficial
              </span>
              <h1
                className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                EloraCRM + <span className="text-rabbit-navy-light">Rabbit Agency</span>
              </h1>
              <p className="mt-5 text-lg text-rabbit-white/70 max-w-xl">
                A máquina de vendas completa para clínicas, consultórios e negócios de saúde.
                Processos 100% integrados entre captação, atendimento e CRM.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="https://rabbitagency.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-rabbit-white text-rabbit-black hover:bg-rabbit-white/90 font-semibold px-6 py-3 rounded-md text-sm transition-colors"
                >
                  Site da Rabbit <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="https://www.instagram.com/rabbit4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-rabbit-white/30 hover:border-rabbit-white text-rabbit-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
                >
                  <Instagram className="h-4 w-4" /> @rabbit4.0
                </a>
              </div>
            </Reveal>

            <Reveal delay={150} className="flex justify-center md:justify-end">
              <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden border border-rabbit-white/10 shadow-2xl">
                <img
                  src={pauloCoelho.url}
                  alt="Paulo Coelho, fundador da Rabbit Agency"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-rabbit-black/90 to-transparent">
                  <p className="text-sm font-semibold text-rabbit-white">Paulo Coelho</p>
                  <p className="text-xs text-rabbit-white/70">Fundador, Rabbit Agency</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* PILARES */}
      <div className="bg-rabbit-white text-rabbit-black py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest uppercase text-rabbit-navy">
              Por que essa parceria funciona
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold mt-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Captação, qualificação e retenção no mesmo time
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="rounded-2xl bg-rabbit-surface border border-rabbit-black/5 p-7 h-full hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-rabbit-black text-rabbit-white flex items-center justify-center mb-5">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3
                    className="text-xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm text-rabbit-gray mt-3 leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* MÁQUINA DE VENDAS */}
      <div className="bg-rabbit-black py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest uppercase text-rabbit-white/60">
              Máquina de vendas
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold text-rabbit-white mt-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Do anúncio à consulta em 4 passos
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-4">
            {PIPELINE.map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <div className="relative rounded-2xl bg-rabbit-white/5 border border-rabbit-white/10 p-6 h-full hover:border-rabbit-navy-light transition-colors">
                  <span
                    className="text-4xl font-bold text-rabbit-navy-light/60"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.step}
                  </span>
                  <h3
                    className="text-lg font-bold text-rabbit-white mt-4"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-sm text-rabbit-white/60 mt-2 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200} className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-2 text-sm text-rabbit-white/70">
              <Workflow className="h-4 w-4" />
              <span>Tudo conectado: Rabbit → Elora → SDR → CRM → Retorno</span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* MONDAY */}
      <div className="bg-rabbit-navy py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rabbit-white/80 border border-rabbit-white/20 rounded-full px-4 py-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Dashboards em tempo real
                </span>
                <h2
                  className="text-3xl md:text-4xl font-bold text-rabbit-white mt-5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Monday + Elora
                </h2>
                <p className="text-rabbit-white/80 mt-4 leading-relaxed">
                  A Rabbit usa o Monday para controlar leads, conversões e pipeline de vendas.
                  Integrado ao EloraCRM, produzimos dashboards interativos e personalizados que
                  mostram o que realmente importa: de onde veio o lead, quanto custou, quem
                  converteu e quanto faturou.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-rabbit-white/80">
                  <li className="flex items-start gap-3">
                    <Users className="h-4 w-4 mt-0.5 shrink-0" />
                    Acompanhamento de leads por origem, campanha e responsável
                  </li>
                  <li className="flex items-start gap-3">
                    <Target className="h-4 w-4 mt-0.5 shrink-0" />
                    Métricas de conversão de tráfego pago em vendas reais
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="h-4 w-4 mt-0.5 shrink-0" />
                    Dashboards customizados para cada cliente e gestor
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-rabbit-black/30 border border-rabbit-white/10 p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-rabbit-white/70">
                    <span>Leads gerados</span>
                    <span className="font-semibold text-rabbit-white">1.240</span>
                  </div>
                  <div className="h-2 bg-rabbit-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[75%] bg-rabbit-white rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-rabbit-white/70">
                    <span>Leads qualificados</span>
                    <span className="font-semibold text-rabbit-white">928</span>
                  </div>
                  <div className="h-2 bg-rabbit-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[55%] bg-rabbit-navy-light rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-rabbit-white/70">
                    <span>Consultas agendadas</span>
                    <span className="font-semibold text-rabbit-white">412</span>
                  </div>
                  <div className="h-2 bg-rabbit-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[33%] bg-rabbit-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-rabbit-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2
              className="text-3xl md:text-4xl font-bold text-rabbit-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Quer montar sua máquina de vendas?
            </h2>
            <p className="text-rabbit-gray mt-4 max-w-xl mx-auto">
              Fale com a Rabbit Agency ou acesse o EloraCRM para ver a operação por dentro.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://rabbitagency.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-rabbit-black text-rabbit-white hover:bg-rabbit-black/90 font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Falar com a Rabbit <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="https://app.eloracrm.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-rabbit-black/30 hover:border-rabbit-black text-rabbit-black font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Acessar Elora App <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
