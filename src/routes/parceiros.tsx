import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, LogIn, Mail, Phone, Globe } from "lucide-react";
import { EloraMark } from "@/components/landing/EloraMark";
import { Parceiros } from "@/components/landing/Parceiros";
import { EMAIL_CONTATO, WHATSAPP_LINK, WHATSAPP_NUMERO } from "@/lib/landing/contato";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros · EloraCRM + Rabbit Agency" },
      {
        name: "description",
        content:
          "Parceria oficial entre EloraCRM e Rabbit Agency: atendimento, CRM e SDR para clínicas, consultórios e negócios de saúde.",
      },
      {
        property: "og:title",
        content: "Parceiros · EloraCRM + Rabbit Agency",
      },
      {
        property: "og:description",
        content:
          "Parceria oficial entre EloraCRM e Rabbit Agency: atendimento, CRM e SDR para clínicas, consultórios e negócios de saúde.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://eloracrm.lovable.app/parceiros" },
    ],
    links: [
      { rel: "canonical", href: "https://eloracrm.lovable.app/parceiros" },
    ],
  }),
  component: ParceirosPage,
});

function ParceirosPage() {
  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <header className="fixed top-0 inset-x-0 z-50 bg-landing-dark/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 leading-none">
            <EloraMark className="h-7 w-7 text-landing-yellow shrink-0 -mt-0.5" />
            <span
              className="text-white font-bold tracking-tight text-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EloraCRM
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
            <Link to="/" className="hover:text-landing-yellow transition">
              Início
            </Link>
            <Link to="/" hash="produto" className="hover:text-landing-yellow transition">
              Produto
            </Link>
            <Link to="/simulador" className="hover:text-landing-yellow transition">
              Simulador
            </Link>
            <Link to="/parceiros" className="text-landing-yellow transition">
              Parceiros
            </Link>
            <Link to="/" hash="contato" className="hover:text-landing-yellow transition">
              Contato
            </Link>
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

      <main className="pt-16">
        <Parceiros />
      </main>

      <footer className="bg-landing-dark-2 text-white/80 py-14 px-6 border-t border-white/10">
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
              <li>
                <Link to="/" className="hover:text-white">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/" hash="produto" className="hover:text-white">
                  Produto
                </Link>
              </li>
              <li>
                <Link to="/simulador" className="hover:text-white">
                  Simulador
                </Link>
              </li>
              <li>
                <Link to="/parceiros" className="hover:text-white">
                  Parceiros
                </Link>
              </li>
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
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow">
              Contato
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {EMAIL_CONTATO}
              </li>
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
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> app.eloracrm.com.br
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 text-xs text-white/40 text-center">
          © {new Date().getFullYear()} EloraCRM. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
