import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Link2, QrCode, LayoutTemplate, Unlock, Inbox, Bot, BadgeDollarSign, User, MessageCircle,
  Smile, Paperclip, Mic, Smartphone, LogOut, Radio, Lightbulb, AlertTriangle, Copy, Check,
  ChevronDown, ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, List, Linkedin, Share2,
} from "lucide-react";
import { slugificar, type Bloco, type ItemCard, type Post } from "@/lib/landing/posts";
import { CHAT_LINK } from "@/lib/landing/contato";
import { BlogCard } from "@/components/landing/BlogCard";

const ICONES: Record<string, typeof Link2> = {
  link: Link2, qr: QrCode, pagina: LayoutTemplate, livre: Unlock, centro: Inbox, bot: Bot,
  moeda: BadgeDollarSign, usuario: User, chat: MessageCircle, emoji: Smile, arquivo: Paperclip,
  audio: Mic, dispositivo: Smartphone, sair: LogOut, status: Radio,
};

/** Converte **negrito** e `código` em elementos. */
export function Rico({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="font-semibold text-landing-fg">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return <code key={i} className="rounded bg-landing-surface border border-landing-border px-1.5 py-0.5 text-[0.9em] font-mono">{p.slice(1, -1)}</code>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export function secoesDo(corpo: Bloco[]) {
  return corpo
    .filter((b): b is Extract<Bloco, { tipo: "h2" }> => b.tipo === "h2")
    .map((b) => ({ id: b.id ?? slugificar(b.texto), texto: b.texto }));
}

function IconeCard({ nome }: { nome?: string }) {
  const I = (nome && ICONES[nome]) || MessageCircle;
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rabbit-navy text-landing-yellow-vivo">
      <I className="h-5 w-5" />
    </span>
  );
}

function Cards({ itens, colunas, compacto }: { itens: ItemCard[]; colunas: 2 | 3; compacto?: boolean }) {
  return (
    <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${colunas === 3 ? "lg:grid-cols-3" : ""}`}>
      {itens.map((c) => (
        <div key={c.titulo} className={`rounded-2xl bg-[#F1F3F7] border border-landing-border ${compacto ? "p-4" : "p-5"}`}>
          <IconeCard nome={c.icone} />
          <h4 className="mt-3 font-bold text-landing-fg">{c.titulo}</h4>
          <p className="mt-1 text-sm leading-relaxed text-landing-muted">{c.texto}</p>
        </div>
      ))}
    </div>
  );
}

function Passos({ itens }: { itens: string[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rabbit-navy text-white font-bold">{i + 1}</span>
          <p className="pt-1.5 text-[17px] leading-7 text-landing-fg/80"><Rico texto={t} /></p>
        </li>
      ))}
    </ol>
  );
}

function Fluxo({ itens }: { itens: ItemCard[] }) {
  return (
    <div className="mt-6 flex flex-col md:flex-row md:items-stretch gap-3">
      {itens.map((c, i) => (
        <Fragment key={c.titulo}>
          <div className="flex-1 rounded-2xl border border-landing-border bg-white p-5">
            <div className="flex items-center gap-3">
              <IconeCard nome={c.icone} />
              <span className="text-xs font-bold uppercase tracking-widest text-rabbit-navy">Etapa {i + 1}</span>
            </div>
            <h4 className="mt-3 font-bold text-landing-fg">{c.titulo}</h4>
            <p className="mt-1 text-sm leading-relaxed text-landing-muted">{c.texto}</p>
          </div>
          {i < itens.length - 1 && (
            <div className="flex items-center justify-center text-landing-yellow-dark" aria-hidden>
              <ArrowRight className="h-6 w-6 rotate-90 md:rotate-0" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function Callout({ variante, texto }: { variante: "dica" | "atencao"; texto: string }) {
  if (variante === "dica")
    return (
      <div className="mt-7 flex gap-3 rounded-xl bg-[#F1F3F7] p-5">
        <Lightbulb className="h-5 w-5 shrink-0 text-landing-yellow-dark mt-0.5" />
        <p className="text-[16px] leading-7 text-landing-fg/85"><strong className="font-semibold">Dica: </strong><Rico texto={texto} /></p>
      </div>
    );
  return (
    <div className="mt-7 flex gap-3 rounded-r-xl border-l-4 border-landing-yellow-vivo bg-[#FFF6CC] p-5">
      <AlertTriangle className="h-5 w-5 shrink-0 text-landing-fg mt-0.5" />
      <p className="text-[16px] leading-7 text-landing-fg"><strong className="font-semibold">Atenção: </strong><Rico texto={texto} /></p>
    </div>
  );
}

function Tabela({ cabecalho, linhas, destacarUltima }: { cabecalho: string[]; linhas: string[][]; destacarUltima?: boolean }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-landing-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-rabbit-navy text-white">
            {cabecalho.map((c, i) => <th key={i} className="px-4 py-3 text-left font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const ultima = destacarUltima && i === linhas.length - 1;
            return (
              <tr key={i} className={ultima ? "bg-[#FFF6CC] font-semibold" : i % 2 === 1 ? "bg-[#F1F3F7]" : "bg-white"}>
                {l.map((c, j) => <td key={j} className={`px-4 py-3 align-top text-landing-fg ${j === 0 ? "font-medium" : ""}`}>{c}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Codigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="mt-6 relative rounded-xl bg-[#111111] text-white">
      <button
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
        }}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold"
      >
        {copiado ? <><Check className="h-3.5 w-3.5 text-landing-yellow-vivo" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
      </button>
      <pre className="overflow-x-auto p-5 pt-12 text-sm leading-6 font-mono"><code>{codigo}</code></pre>
    </div>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function calcularSimulacao(atendimentos: number, respostas: number, marketing: number) {
  const mensagensServico = Math.max(0, atendimentos) * Math.max(0, respostas);
  const custoServico = Math.max(0, mensagensServico - 1000) * 0.035;
  const custoMarketing = Math.max(0, marketing) * 0.3217;
  return { totalAPI: custoServico + custoMarketing };
}

function Simulador() {
  const [at, setAt] = useState(1000);
  const [resp, setResp] = useState(8);
  const [mkt, setMkt] = useState(300);
  const { totalAPI } = calcularSimulacao(at, resp, mkt);
  const campo = (label: string, v: number, set: (n: number) => void) => (
    <label className="block">
      <span className="text-sm font-medium text-landing-fg">{label}</span>
      <input
        type="number" min={0} inputMode="numeric" value={Number.isFinite(v) ? v : 0}
        onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1.5 w-full rounded-lg border border-landing-border bg-white px-3 py-2.5 text-landing-fg outline-none focus:border-rabbit-navy"
      />
    </label>
  );
  return (
    <section className="mt-10 rounded-2xl border border-landing-border bg-white p-6 md:p-8 shadow-sm">
      <h3 className="text-xl md:text-2xl font-bold text-landing-fg" style={{ fontFamily: "var(--font-display)" }}>
        Simule quanto você gastaria na API Oficial
      </h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {campo("Atendimentos por mês", at, setAt)}
        {campo("Respostas do atendente por atendimento", resp, setResp)}
        {campo("Mensagens de marketing enviadas pela empresa por mês", mkt, setMkt)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-rabbit-navy p-5 text-white">
          <p className="text-sm text-white/75">API Oficial do WhatsApp</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold">{brl(totalAPI)} <span className="text-base font-medium text-white/75">por mês</span></p>
        </div>
        <div className="rounded-xl bg-landing-yellow-vivo p-5 text-landing-fg">
          <p className="text-sm">WebChat</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold">{brl(0)} <span className="text-base font-medium">em tarifa Meta</span></p>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold text-landing-fg">
        Economia estimada: <span className="text-rabbit-navy">{brl(totalAPI)}</span> por mês
      </p>
      <p className="mt-3 text-xs text-landing-muted">
        Estimativa com base nas tarifas públicas da Meta para o Brasil. Não inclui o valor do plano Elora CRM. As tarifas podem mudar.
      </p>
    </section>
  );
}

function Cta({ titulo, texto, final }: { titulo: string; texto: string; final?: boolean }) {
  return (
    <div className={`mt-10 rounded-2xl p-7 md:p-8 ${final ? "bg-rabbit-navy text-white text-center" : "bg-[#F1F3F7] text-landing-fg border border-landing-border"}`}>
      <h3 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{titulo}</h3>
      <p className={`mt-2 ${final ? "text-white/75" : "text-landing-muted"}`}>{texto}</p>
      <a
        href={CHAT_LINK} target="_blank" rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-landing-yellow-vivo hover:bg-landing-yellow px-6 py-3 font-semibold text-landing-fg transition-colors"
      >
        Quero ativar o WebChat <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function Faq({ itens }: { itens: { pergunta: string; resposta: string }[] }) {
  const [aberto, setAberto] = useState<number | null>(0);
  return (
    <div className="mt-6 divide-y divide-landing-border rounded-2xl border border-landing-border bg-white">
      {itens.map((f, i) => {
        const on = aberto === i;
        return (
          <div key={f.pergunta}>
            <button
              type="button" aria-expanded={on}
              onClick={() => setAberto(on ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-landing-fg"
            >
              {f.pergunta}
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${on ? "rotate-180 text-rabbit-navy" : "text-landing-muted"}`} />
            </button>
            {on && <p className="px-5 pb-5 text-[16px] leading-7 text-landing-fg/80">{f.resposta}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function BlocoArtigo({ b }: { b: Bloco }) {
  switch (b.tipo) {
    case "h2":
      return (
        <h2 id={b.id ?? slugificar(b.texto)} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-landing-fg mt-14 mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {b.texto}
        </h2>
      );
    case "h3":
      return <h3 className="text-xl font-bold text-landing-fg mt-10 mb-2" style={{ fontFamily: "var(--font-display)" }}>{b.texto}</h3>;
    case "p":
      return <p className="text-[17px] leading-8 text-landing-fg/80 mt-5"><Rico texto={b.texto} /></p>;
    case "lista":
      return (
        <ul className="mt-5 space-y-2.5">
          {b.itens.map((it) => (
            <li key={it} className="flex gap-3 text-[17px] leading-7 text-landing-fg/80">
              <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-landing-yellow-vivo shrink-0" />
              <span><Rico texto={it} /></span>
            </li>
          ))}
        </ul>
      );
    case "citacao":
      return <blockquote className="mt-8 border-l-4 border-landing-yellow-vivo bg-landing-surface rounded-r-xl px-6 py-5 text-lg italic text-landing-fg/85">{b.texto}</blockquote>;
    case "cards": return <Cards itens={b.itens} colunas={b.colunas} compacto={b.compacto} />;
    case "passos": return <Passos itens={b.itens} />;
    case "fluxo": return <Fluxo itens={b.itens} />;
    case "callout": return <Callout variante={b.variante} texto={b.texto} />;
    case "tabela": return <Tabela cabecalho={b.cabecalho} linhas={b.linhas} destacarUltima={b.destacarUltima} />;
    case "codigo": return <Codigo codigo={b.codigo} />;
    case "simulador": return <Simulador />;
    case "cta": return <Cta titulo={b.titulo} texto={b.texto} final={b.final} />;
    case "faq": return <Faq itens={b.itens} />;
    case "nota": return <p className="mt-10 text-sm italic text-landing-muted">{b.texto}</p>;
  }
}

/** Sumário com destaque da seção atual. */
export function SumarioArtigo({ secoes, movel = false }: { secoes: { id: string; texto: string }[]; movel?: boolean }) {
  const [ativa, setAtiva] = useState<string | null>(secoes[0]?.id ?? null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const els = secoes.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setAtiva(vis[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [secoes]);

  const lista = (
    <ul className="space-y-1">
      {secoes.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={() => setAberto(false)}
            className={`block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors ${
              ativa === s.id ? "border-landing-yellow-vivo bg-landing-yellow-soft font-semibold text-landing-fg" : "border-transparent text-landing-muted hover:text-landing-fg"
            }`}
          >
            {s.texto}
          </a>
        </li>
      ))}
    </ul>
  );

  if (movel)
    return (
      <div className="rounded-xl border border-landing-border bg-white">
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-landing-fg">
          <span className="inline-flex items-center gap-2"><List className="h-4 w-4" /> Neste artigo</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
        {aberto && <div className="px-2 pb-3">{lista}</div>}
      </div>
    );
  return (
    <nav aria-label="Sumário" className="sticky top-28">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-rabbit-navy">Neste artigo</p>
      {lista}
    </nav>
  );
}

export function Compartilhar({ url, titulo }: { url: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const btn = "inline-flex items-center gap-1.5 rounded-md border border-landing-border bg-white px-3.5 py-2 text-sm font-medium text-landing-fg hover:border-rabbit-navy transition-colors";
  return (
    <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-landing-border pt-6">
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold text-landing-fg"><Share2 className="h-4 w-4" /> Compartilhar:</span>
      <a className={btn} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a className={btn} target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>
        <Linkedin className="h-4 w-4" /> LinkedIn
      </a>
      <button type="button" className={btn} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ } }}>
        {copiado ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {copiado ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

export function CarrosselRelacionados({ posts }: { posts: Post[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mover = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  const seta = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-landing-border bg-white text-landing-fg hover:border-rabbit-navy";
  return (
    <section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-landing-fg" style={{ fontFamily: "var(--font-display)" }}>Continue lendo</h2>
          <div className="flex gap-2">
            <button type="button" aria-label="Anterior" className={seta} onClick={() => mover(-1)}><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" aria-label="Próximo" className={seta} onClick={() => mover(1)}><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div ref={ref} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
          {posts.map((p) => (
            <div key={p.slug} className="w-[85%] sm:w-[46%] lg:w-[31%] shrink-0 snap-start">
              <BlogCard post={p} />
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rabbit-navy hover:underline">
            Ver mais conteúdo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Breadcrumb({ itens }: { itens: ReactNode[] }) {
  return (
    <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1.5 text-sm text-white/60">
      {itens.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {it}
        </Fragment>
      ))}
    </nav>
  );
}

export function useSecoes(corpo: Bloco[]) {
  return useMemo(() => secoesDo(corpo), [corpo]);
}
