import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight } from "lucide-react";
import { formatarData, type Post } from "@/lib/landing/posts";

export function BlogCard({ post, destaque = false }: { post: Post; destaque?: boolean }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className={`group block rounded-2xl border border-landing-border bg-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:border-rabbit-navy/30 ${
        destaque ? "md:grid md:grid-cols-2 md:items-stretch" : ""
      }`}
    >
      <div className={`overflow-hidden bg-landing-surface ${destaque ? "h-full min-h-56" : ""}`}>
        <img
          src={post.capa}
          alt={`Capa do artigo ${post.titulo}`}
          loading="lazy"
          className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            destaque ? "h-full min-h-56" : "h-48"
          }`}
        />
      </div>

      <div className={`p-6 ${destaque ? "md:p-9 flex flex-col justify-center" : ""}`}>
        <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-rabbit-navy bg-rabbit-navy/10 rounded-full px-3 py-1">
          {post.categoria}
        </span>
        <h3
          className={`mt-3 font-bold text-landing-fg leading-tight ${
            destaque ? "text-2xl md:text-3xl" : "text-lg"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {post.titulo}
        </h3>
        <p className="mt-3 text-sm text-landing-muted leading-relaxed">{post.resumo}</p>
        <div className="mt-5 flex items-center gap-3 text-xs text-landing-muted">
          <span>{post.autor}</span>
          <span aria-hidden>•</span>
          <span>{formatarData(post.data)}</span>
          <span aria-hidden>•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {post.leitura} min
          </span>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-rabbit-navy group-hover:gap-2.5 transition-all">
          Ler artigo <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
