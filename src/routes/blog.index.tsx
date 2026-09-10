import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Navbar, Footer, PageHeader } from "@/components/landing/SiteChrome";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { BlogCard } from "@/components/landing/BlogCard";
import { Reveal } from "@/components/landing/motion";
import { normalizar } from "@/components/landing/FaqLista";
import { POSTS, CATEGORIAS } from "@/lib/landing/posts";

const TITULO = "Blog — EloraCRM";
const DESC =
  "Conteúdo prático sobre atendimento no WhatsApp, vendas, agentes de IA e gestão de operação, direto do time do EloraCRM.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://eloracrm.com.br/blog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://eloracrm.com.br/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return POSTS.filter((p) => {
      const okCat = !cat || p.categoria === cat;
      const okBusca =
        !termo ||
        normalizar(`${p.titulo} ${p.resumo} ${p.categoria}`).includes(termo);
      return okCat && okBusca;
    });
  }, [busca, cat]);

  const [destaque, ...resto] = filtrados;

  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />

      <PageHeader
        etiqueta="Conteúdo"
        titulo="Blog do EloraCRM"
        descricao="Atendimento, vendas, inteligência artificial e gestão — sem enrolação."
      >
        <>
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar artigo..."
              aria-label="Buscar artigo"
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

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Pill ativo={cat === null} onClick={() => setCat(null)}>
              Todos
            </Pill>
            {CATEGORIAS.map((c) => (
              <Pill key={c} ativo={cat === c} onClick={() => setCat(cat === c ? null : c)}>
                {c}
              </Pill>
            ))}
          </div>
        </>
      </PageHeader>


      <section className="py-14 md:py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {filtrados.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-landing-muted">
                Nenhum artigo encontrado para essa busca.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setCat(null);
                }}
                className="mt-5 inline-flex items-center gap-1.5 bg-rabbit-navy hover:bg-rabbit-navy/90 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Ver todos os artigos
              </button>
            </div>
          ) : (
            <>
              {destaque && (
                <Reveal>
                  <BlogCard post={destaque} destaque />
                </Reveal>
              )}
              {resto.length > 0 && (
                <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {resto.map((p, i) => (
                    <Reveal key={p.slug} delay={i * 90}>
                      <BlogCard post={p} />
                    </Reveal>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-14 text-center">
            <Link to="/faq" className="text-sm text-landing-muted hover:text-landing-fg underline">
              Procurando uma resposta rápida? Veja as perguntas frequentes
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

function Pill({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
        ativo
          ? "bg-landing-yellow-vivo border-landing-yellow-vivo text-landing-fg"
          : "border-white/25 text-white/75 hover:border-landing-yellow-vivo hover:text-landing-yellow-vivo"
      }`}
    >
      {children}
    </button>
  );
}
