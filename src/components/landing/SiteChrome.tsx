import { Link } from "@tanstack/react-router";
import { Mail, Phone, Globe, ArrowUpRight, LogIn, Rabbit } from "lucide-react";
import { EloraMark } from "@/components/landing/EloraMark";
import { WHATSAPP_LINK, WHATSAPP_NUMERO, EMAIL_CONTATO } from "@/lib/landing/contato";
import { usePerfil } from "@/hooks/use-perfil";
import { UserMenu } from "@/components/user-menu";
import { useDestinoPainel } from "@/lib/use-papel";
import seloMeta from "@/assets/meta-business-partner.png.asset.json";

export function Navbar() {
  const { session, nome, email, avatarUrl, iniciais } = usePerfil();
  const destinoPainel = useDestinoPainel(Boolean(session));
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-landing-dark/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 leading-none">
          <EloraMark className="h-7 w-7 text-landing-yellow-vivo shrink-0 -mt-0.5" />
          <span
            className="hidden sm:inline text-white font-bold tracking-tight text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            EloraCRM
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
          <Link to="/parceiros" className="hover:text-landing-yellow-vivo transition">
            Parceiros
          </Link>
          <Link to="/blog" className="hover:text-landing-yellow-vivo transition">
            Blog
          </Link>
          <Link to="/faq" className="hover:text-landing-yellow-vivo transition">
            Perguntas frequentes
          </Link>
          {session && (
            <Link to={destinoPainel} className="font-semibold text-landing-yellow-vivo hover:opacity-80 transition">
              Meu painel
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://app.eloracrm.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-4 sm:px-5 py-2 rounded-md text-sm transition-colors"
          >
            Elora App <ArrowUpRight className="h-4 w-4" />
          </a>
          {session ? (
            <UserMenu nome={nome} email={email} avatarUrl={avatarUrl} iniciais={iniciais} />
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 whitespace-nowrap border border-white/30 hover:border-landing-yellow-vivo hover:text-landing-yellow-vivo text-white font-semibold px-3 sm:px-4 py-2 rounded-md text-sm transition-colors"
            >
              <LogIn className="h-4 w-4" /> Logar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** Cabeçalho padrão das páginas de navegação do site. */
export function PageHeader({
  etiqueta,
  titulo,
  descricao,
  children,
}: {
  etiqueta: string;
  titulo: React.ReactNode;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative bg-landing-dark text-white pt-28 pb-14 md:pt-32 md:pb-16 px-6 overflow-hidden">
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
          {etiqueta}
        </span>
        <h1
          className="mt-3 text-4xl md:text-5xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-4 text-white/70 max-w-2xl mx-auto">{descricao}</p>
        )}
        {children}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer
      id="contato"
      className="bg-landing-dark-2 text-white/80 py-14 px-6 border-t border-white/10"
    >
      <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-3 md:gap-8 items-start">
        <div>
          <div className="flex items-center gap-2 leading-none">
            <EloraMark className="h-7 w-7 text-landing-yellow-vivo shrink-0" />
            <span
              className="text-white font-bold tracking-tight text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EloraCRM
            </span>
          </div>
          <p className="text-sm text-white/60 mt-3 max-w-xs">
            Para as conversas e o negócio andarem juntos.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <Link to="/blog" className="text-sm text-landing-yellow-vivo hover:underline">
              Blog
            </Link>
            <Link to="/faq" className="text-sm text-landing-yellow-vivo hover:underline">
              Perguntas frequentes
            </Link>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow-vivo">
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

        <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-landing-yellow-vivo">
            <Rabbit className="h-4 w-4" /> Parceiro oficial
          </div>
          <p className="text-sm text-white/70 mt-3">
            Máquina de vendas, SDR dedicado e processos 100% integrados ao Elora.
          </p>
          <Link
            to="/parceiros"
            className="inline-flex items-center gap-1.5 mt-4 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-5 py-2.5 rounded-md text-sm transition-colors"
          >
            Conheça a Rabbit Agency <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col items-center gap-3 text-xs text-white/40 text-center">
        <img
          src={seloMeta.url}
          alt="Selo Meta Business Partner"
          className="h-10 w-auto opacity-90 bg-white rounded-md p-1"
          loading="lazy"
        />
        <p>© {new Date().getFullYear()} EloraCRM. Todos os direitos reservados.</p>
        <p className="text-white/30 -mt-2">DITOS & C.O LTDA</p>
      </div>
    </footer>
  );
}
