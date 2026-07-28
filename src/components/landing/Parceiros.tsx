import { Stethoscope, MessagesSquare, Target, ArrowRight, Instagram, Globe, type LucideIcon } from "lucide-react";
import { Reveal } from "./motion";

const BENEFICIOS = [
  {
    icon: MessagesSquare,
    title: "Atendimento e CRM",
    desc: "A Elora entra com a plataforma de atendimento omnichannel e o CRM que organiza cada paciente do primeiro contato ao retorno.",
  },
  {
    icon: Target,
    title: "SDR e qualificação",
    desc: "Fluxos de SDR e cadências de follow-up que qualificam leads vindos das campanhas da Rabbit antes de chegarem na recepção.",
  },
  {
    icon: Stethoscope,
    title: "Foco em saúde",
    desc: "Operação desenhada para clínicas, consultórios e médicos: agenda cheia, menos no-show e histórico completo do paciente.",
  },
];

type PartnerCardProps = {
  nome: string;
  descricao: string;
  siteUrl: string;
  socialUrl: string;
  socialIcon?: LucideIcon;
  logo?: React.ReactNode;
};

function PartnerCard({ nome, descricao, siteUrl, socialUrl, socialIcon: SocialIcon = Instagram, logo }: PartnerCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-landing-border p-7 h-full hover:shadow-lg hover:-translate-y-0.5 hover:border-landing-blue transition-all flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <div className="h-12 w-12 rounded-xl bg-landing-surface flex items-center justify-center overflow-hidden">
              {logo}
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-landing-blue/10 text-landing-blue flex items-center justify-center text-xl font-bold">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          <h3
            className="text-xl font-bold text-landing-fg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {nome}
          </h3>
        </div>
      </div>

      <p className="text-sm text-landing-muted leading-relaxed flex-1">{descricao}</p>

      <div className="mt-5 flex items-center gap-3">
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-landing-blue hover:text-landing-blue-dark transition-colors"
        >
          <Globe className="h-4 w-4" /> Site <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href={socialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-landing-surface text-landing-fg hover:bg-landing-blue hover:text-white transition-colors"
          aria-label={`Instagram de ${nome}`}
        >
          <SocialIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

const RABBIT: PartnerCardProps = {
  nome: "Rabbit Agency",
  descricao:
    "Agência de marketing digital e estratégias de vendas de Curitiba, especializada em geração de leads qualificados e tráfego pago para clínicas, consultórios e profissionais da saúde.",
  siteUrl: "https://rabbitagency.com.br/",
  socialUrl: "https://www.instagram.com/rabbit4.0/",
};

export function Parceiros() {
  return (
    <section id="parceiros" className="py-20 px-6 bg-landing-surface">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Parceria oficial
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Elora + Rabbit Agency
          </h2>
          <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
            A Rabbit atrai e qualifica a demanda. A Elora sustenta o atendimento, o CRM e o
            SDR. Juntas, formam a máquina de vendas de clínicas, médicos e negócios de saúde.
          </p>
        </Reveal>

        <div className="max-w-xl mx-auto mb-12">
          <Reveal>
            <PartnerCard {...RABBIT} />
          </Reveal>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.title} delay={i * 100}>
              <div className="rounded-2xl bg-white border border-landing-border p-7 h-full hover:shadow-lg hover:-translate-y-0.5 hover:border-landing-blue transition-all">
                <div className="h-11 w-11 rounded-xl bg-landing-blue/10 text-landing-blue flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3
                  className="text-xl font-bold text-landing-fg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {b.title}
                </h3>
                <p className="text-sm text-landing-muted mt-2 leading-relaxed">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16" delay={100}>
          <div className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
              Como funciona
            </span>
            <h3
              className="text-2xl md:text-3xl font-bold text-landing-fg mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Uma máquina de vendas ponta a ponta
            </h3>
            <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
              Campanha da Rabbit gera o lead → o lead cai na central da Elora → o SDR qualifica
              com cadências automáticas → o CRM acompanha até a consulta agendada e o retorno.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
