import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { Navbar, Footer } from "@/components/landing/SiteChrome";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";
import { ProgressoLeitura } from "@/components/landing/ProgressoLeitura";
import { BlogCard } from "@/components/landing/BlogCard";
import { POSTS, getPost, formatarData } from "@/lib/landing/posts";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) {
      return {
        meta: [{ title: "Artigo não encontrado — EloraCRM" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = `https://eloracrm.com.br/blog/${post.slug}`;
    return {
      meta: [
        { title: `${post.titulo} — Blog EloraCRM` },
        { name: "description", content: post.resumo },
        { property: "og:title", content: post.titulo },
        { property: "og:description", content: post.resumo },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.titulo,
            description: post.resumo,
            datePublished: post.data,
            author: { "@type": "Organization", name: post.autor },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const post = getPost(slug);

  if (!post) {
    return (
      <div
        className="min-h-screen bg-landing-bg text-landing-fg"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 pt-40 pb-32 text-center">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Artigo não encontrado
          </h1>
          <p className="text-landing-muted mt-3">
            Esse conteúdo pode ter sido movido ou ainda não foi publicado.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 mt-6 bg-rabbit-navy hover:bg-rabbit-navy/90 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relacionados = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />
      <ProgressoLeitura />

      <article>
        <header className="relative bg-landing-dark text-white pt-28 pb-14 md:pt-32 md:pb-16 px-6 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(900px circle at 80% 10%, #1e3a5f 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, #2a4a73 0%, transparent 65%)",
            }}
          />
          <div className="relative max-w-3xl mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-landing-yellow-vivo transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
            <span className="mt-5 inline-block text-[11px] font-semibold uppercase tracking-widest text-landing-yellow-vivo border border-landing-yellow-vivo/30 rounded-full px-3 py-1">
              {post.categoria}
            </span>
            <h1
              className="mt-4 text-3xl md:text-5xl font-bold leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {post.titulo}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span>{post.autor}</span>
              <span aria-hidden>•</span>
              <span>{formatarData(post.data)}</span>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> {post.leitura} min de leitura
              </span>
            </div>
          </div>
        </header>

        <div className="px-6 -mt-8 md:-mt-10">
          <img
            src={post.capa}
            alt={`Capa do artigo ${post.titulo}`}
            className="max-w-4xl mx-auto w-full rounded-2xl border border-landing-border shadow-xl object-cover"
          />
        </div>

        <div className="max-w-2xl mx-auto px-6 py-14 md:py-16">
          {post.corpo.map((b, i) => {
            if (b.tipo === "h2")
              return (
                <h2
                  key={i}
                  className="text-2xl md:text-3xl font-bold text-landing-fg mt-12 mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {b.texto}
                </h2>
              );
            if (b.tipo === "p")
              return (
                <p key={i} className="text-[17px] leading-8 text-landing-fg/80 mt-5">
                  {b.texto}
                </p>
              );
            if (b.tipo === "lista")
              return (
                <ul key={i} className="mt-5 space-y-2.5">
                  {b.itens.map((it) => (
                    <li key={it} className="flex gap-3 text-[17px] leading-7 text-landing-fg/80">
                      <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-landing-yellow-vivo shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
              );
            return (
              <blockquote
                key={i}
                className="mt-8 border-l-4 border-landing-yellow-vivo bg-landing-surface rounded-r-xl px-6 py-5 text-lg italic text-landing-fg/85"
              >
                {b.texto}
              </blockquote>
            );
          })}

          <div className="mt-14 rounded-2xl bg-landing-dark text-white p-8 text-center">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Quer ver isso funcionando na sua operação?
            </h2>
            <p className="text-white/70 mt-3">
              Centralize WhatsApp, Instagram e Messenger com CRM, chatbot e agentes de IA.
            </p>
            <a
              href="https://app.eloracrm.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-7 py-3 rounded-md transition-colors"
            >
              Conhecer o Elora App <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </article>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-xl font-bold text-landing-fg mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Continue lendo
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {relacionados.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
