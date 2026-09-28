import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { Navbar, Footer } from "@/components/landing/SiteChrome";
import { ProgressoLeitura } from "@/components/landing/ProgressoLeitura";
import { BlogCard } from "@/components/landing/BlogCard";
import {
  BlocoArtigo, Breadcrumb, CarrosselRelacionados, Compartilhar, SumarioArtigo, useSecoes,
} from "@/components/landing/blog/Artigo";
import { Newsletter } from "@/components/landing/blog/Newsletter";
import { POSTS, getPost, formatarData, type Post } from "@/lib/landing/posts";

const SITE = "https://eloracrm.com.br";
const absoluta = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`);

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) {
      return {
        meta: [{ title: "Artigo não encontrado — EloraCRM" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = `${SITE}/blog/${post.slug}`;
    const titulo = post.seoTitulo ?? `${post.titulo} — Blog EloraCRM`;
    const desc = post.seoDescricao ?? post.resumo;
    const img = post.ogImage ? absoluta(post.ogImage) : null;
    const faq = post.corpo.find((b) => b.tipo === "faq");
    const scripts = [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.seoTitulo ?? post.titulo,
          description: desc,
          datePublished: post.data,
          author: { "@type": "Organization", name: post.autor },
          publisher: { "@type": "Organization", name: "Elora CRM" },
          mainEntityOfPage: url,
          ...(img ? { image: img } : {}),
        }),
      },
    ];
    if (faq && faq.tipo === "faq") {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.itens.map((f) => ({
            "@type": "Question",
            name: f.pergunta,
            acceptedAnswer: { "@type": "Answer", text: f.resposta },
          })),
        }),
      });
    }
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: post.seoTitulo ?? post.titulo },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: BlogPost,
});

function NaoEncontrado() {
  return (
    <div className="min-h-screen bg-landing-bg text-landing-fg" style={{ fontFamily: "var(--font-body)" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 pt-40 pb-32 text-center">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Artigo não encontrado</h1>
        <p className="text-landing-muted mt-3">Esse conteúdo pode ter sido movido ou ainda não foi publicado.</p>
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

function BlogPost() {
  const { slug } = Route.useParams();
  const post = getPost(slug);
  if (!post) return <NaoEncontrado />;
  return post.subtitulo ? <ArtigoRico post={post} /> : <ArtigoSimples post={post} />;
}

function Meta({ post }: { post: Post }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/60">
      <span>{post.autor}</span>
      <span aria-hidden>•</span>
      <time dateTime={post.data}>{formatarData(post.data)}</time>
      <span aria-hidden>•</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-4 w-4" /> {post.leitura} min de leitura
      </span>
    </div>
  );
}

function Fundo() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-40"
      style={{
        background:
          "radial-gradient(900px circle at 80% 10%, #1e3a5f 0%, transparent 55%), radial-gradient(700px circle at 10% 90%, #2a4a73 0%, transparent 65%)",
      }}
    />
  );
}

function ArtigoRico({ post }: { post: Post }) {
  const secoes = useSecoes(post.corpo);
  const url = `${SITE}/blog/${post.slug}`;
  const relacionados = POSTS.filter((p) => p.slug !== post.slug);
  return (
    <div className="min-h-screen bg-landing-bg text-landing-fg" style={{ fontFamily: "var(--font-body)" }}>
      <Navbar />
      <ProgressoLeitura />
      <article>
        <header className="relative bg-landing-dark text-white pt-28 pb-14 md:pt-32 md:pb-16 px-6 overflow-hidden">
          <Fundo />
          <div className="relative max-w-4xl mx-auto">
            <Breadcrumb
              itens={[
                <Link key="i" to="/" className="hover:text-landing-yellow-vivo">Início</Link>,
                <Link key="b" to="/blog" className="hover:text-landing-yellow-vivo">Blog</Link>,
                <span key="c" className="text-white/85">{post.categoria}</span>,
              ]}
            />
            <span className="mt-5 inline-block rounded-full bg-landing-yellow-vivo px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-landing-fg">
              {post.categoria}
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {post.titulo}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/75 max-w-3xl">{post.subtitulo}</p>
            <Meta post={post} />
          </div>
        </header>

        <div className="px-6 -mt-8 md:-mt-10">
          <img
            src={post.capa}
            alt="Ilustração de um chat aberto no navegador ao lado de um QR Code"
            width={1200}
            height={630}
            className="max-w-5xl mx-auto w-full rounded-2xl border border-landing-border shadow-xl object-cover"
          />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 lg:grid lg:grid-cols-[minmax(0,720px)_260px] lg:justify-between lg:gap-12">
          <div className="min-w-0">
            <div className="lg:hidden mb-6">
              <SumarioArtigo secoes={secoes} movel />
            </div>
            {post.corpo.map((b, i) => (
              <BlocoArtigo key={i} b={b} />
            ))}
            <Compartilhar url={url} titulo={post.titulo} />
          </div>
          <aside className="hidden lg:block">
            <SumarioArtigo secoes={secoes} />
          </aside>
        </div>
      </article>

      <CarrosselRelacionados posts={relacionados} />
      <Newsletter origem={`blog/${post.slug}`} />
      <Footer />
    </div>
  );
}

function ArtigoSimples({ post }: { post: Post }) {
  const relacionados = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <div className="min-h-screen bg-landing-bg text-landing-fg" style={{ fontFamily: "var(--font-body)" }}>
      <Navbar />
      <ProgressoLeitura />
      <article>
        <header className="relative bg-landing-dark text-white pt-28 pb-14 md:pt-32 md:pb-16 px-6 overflow-hidden">
          <Fundo />
          <div className="relative max-w-3xl mx-auto">
            <Link to="/blog" className="flex w-fit items-center gap-1.5 text-sm text-white/60 hover:text-landing-yellow-vivo transition-colors">
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
            <span className="mt-5 inline-block text-[11px] font-semibold uppercase tracking-widest text-landing-yellow-vivo border border-landing-yellow-vivo/30 rounded-full px-3 py-1">
              {post.categoria}
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {post.titulo}
            </h1>
            <Meta post={post} />
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
          {post.corpo.map((b, i) => (
            <BlocoArtigo key={i} b={b} />
          ))}

          <div className="mt-14 rounded-2xl bg-landing-dark text-white p-8 text-center">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Quer ver isso funcionando na sua operação?
            </h2>
            <p className="text-white/70 mt-3">Centralize WhatsApp, Instagram e Messenger com CRM, chatbot e agentes de IA.</p>
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
          <h2 className="text-xl font-bold text-landing-fg mb-6" style={{ fontFamily: "var(--font-display)" }}>Continue lendo</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {relacionados.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
