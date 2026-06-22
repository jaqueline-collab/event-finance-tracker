import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PawLogo } from "@/components/landing/PawLogo";

const TITULOS: Record<string, { titulo: string; resumo: string }> = {
  "central-de-atendimento": {
    titulo: "Central de Atendimento",
    resumo:
      "WhatsApp, Instagram e Messenger integrados em uma única caixa de entrada, com etiquetas, distribuição automática e CRM dentro da conversa.",
  },
  chatbot: {
    titulo: "Chatbot",
    resumo:
      "Crie fluxos de atendimento e automação para qualificar leads, agendar horários e responder perguntas frequentes sem código.",
  },
  "disparo-de-mensagens": {
    titulo: "Disparo de Mensagens",
    resumo:
      "Campanhas de marketing por WhatsApp com segmentação fina e alta taxa de leitura.",
  },
  crm: {
    titulo: "CRM",
    resumo:
      "Gestão de clientes com segmentação inteligente e jornada mapeada, baseada em conversas reais.",
  },
  "agentes-inteligentes": {
    titulo: "Agentes Inteligentes",
    resumo:
      "Assistentes com IA que entendem, interagem e resolvem solicitações com tom humanizado.",
  },
  rastreabilidade: {
    titulo: "Rastreabilidade",
    resumo:
      "Atribuição da origem de cada lead, acompanhamento da navegação e medição de conversão por campanha.",
  },
};

export const Route = createFileRoute("/funcionalidades/$slug")({
  head: ({ params }) => {
    const f = TITULOS[params.slug];
    const titulo = f?.titulo ?? "Funcionalidade";
    return {
      meta: [
        { title: `${titulo} — EloraCRM` },
        { name: "description", content: f?.resumo ?? "Funcionalidade do EloraCRM." },
      ],
    };
  },
  component: FuncionalidadePage,
});

function FuncionalidadePage() {
  const { slug } = Route.useParams();
  const f = TITULOS[slug] ?? { titulo: "Funcionalidade", resumo: "Em breve mais detalhes." };

  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <header className="bg-landing-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 leading-none">
            <PawLogo className="h-7 w-7 text-landing-yellow shrink-0 -mt-0.5" />
            <span
              className="text-white font-bold tracking-tight text-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EloraCRM
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-landing-yellow transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Funcionalidade
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {f.titulo}
          </h1>
          <p className="text-landing-muted mt-4 text-lg leading-relaxed">{f.resumo}</p>
          <div className="mt-10 rounded-2xl border border-dashed border-landing-border bg-landing-surface p-8 text-center">
            <p className="text-sm text-landing-muted">
              Página detalhada em construção. Em breve, prints, vídeos e casos de uso desta
              funcionalidade.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}