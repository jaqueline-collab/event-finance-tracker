import { Link } from "@tanstack/react-router";
import { Handshake, Percent, LifeBuoy, ArrowRight } from "lucide-react";
import { Reveal } from "./motion";
import { WHATSAPP_LINK } from "@/lib/landing/contato";

const BENEFICIOS = [
  {
    icon: Percent,
    title: "Comissão recorrente",
    desc: "Você indica, implanta e recebe todo mês enquanto o cliente estiver ativo.",
  },
  {
    icon: LifeBuoy,
    title: "Suporte de bastidor",
    desc: "Time técnico da Elora junto com você na implantação e nas dúvidas do cliente.",
  },
  {
    icon: Handshake,
    title: "Painel do parceiro",
    desc: "Acompanhe clientes, fechamentos e repasses direto na sua área exclusiva.",
  },
];

export function Parceiros() {
  return (
    <section id="parceiros" className="py-20 px-6 bg-landing-surface">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Parceiros
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cresça junto com a Elora
          </h2>
          <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
            Agências, consultorias e integradores que revendem o EloraCRM têm receita
            recorrente e suporte dedicado.
          </p>
        </Reveal>

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

        <Reveal delay={150}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold px-7 py-3.5 rounded-md transition-colors inline-flex items-center gap-2"
            >
              Quero ser parceiro <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/auth"
              className="border border-landing-fg/20 hover:border-landing-fg text-landing-fg font-semibold px-7 py-3.5 rounded-md transition-colors"
            >
              Já sou parceiro
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
