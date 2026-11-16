import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ExternalLink, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CartoesGraficos, usarFonteIncorporada } from "@/components/cartoes-graficos";
import { MatrizCliente } from "@/components/matriz-cliente";
import { SeletorPeriodo } from "@/components/painel-visual";
import { calcularPainelIncorporado, itensDiaIncorporado, lerPainelIncorporado, matrizIncorporada } from "@/lib/incorporar.functions";
import { tokenValido } from "@/lib/incorporar";
import { BLOCO_TABELA_MATRIZ } from "@/lib/graficos";
import { periodoDe, type Periodo, type PeriodoChave } from "@/lib/painel-visual";
import { textoSelo } from "@/lib/filtros-fixos";
import type { FiltroCampo } from "@/lib/campos-elora";

export const Route = createFileRoute("/incorporado")({
  validateSearch: zodValidator(z.object({ tema: fallback(z.enum(["claro", "escuro", ""]), "").default("") })),
  head: () => ({
    meta: [
      { title: "Painel · Elora" },
      { name: "description", content: "Painel de resultados do Elora, somente leitura." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel · Elora" },
      { property: "og:description", content: "Painel de resultados do Elora, somente leitura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PainelIncorporado,
});

type Info = Extract<Awaited<ReturnType<typeof lerPainelIncorporado>>, { valido: true }>;

function PainelIncorporado() {
  const { tema } = Route.useSearch();
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [chave, setChave] = useState<PeriodoChave>("30d");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDe("30d", new Date().toISOString()));
  const [filtros, setFiltros] = useState<FiltroCampo[]>([]);
  // aba atual lida pela fonte no momento da chamada (definida já na renderização, antes dos blocos pedirem)
  const abaRef = useRef<string>("");
  abaRef.current = ativa ?? "";

  useEffect(() => {
    if (tema) document.documentElement.classList.toggle("dark", tema === "escuro");
  }, [tema]);

  // O token fica depois do "#": o navegador nunca o envia no endereço; só vai dentro das chamadas.
  useEffect(() => {
    const t = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!tokenValido(t)) { setInvalido(true); return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    usarFonteIncorporada({
      calcular: (a, cartoes) => calcularPainelIncorporado({ data: { token, abaId: abaRef.current, de: a.de, ate: a.ate, filtrosVisao: a.filtrosVisao, cartoes } }) as Promise<Record<string, unknown>>,
      itensDia: (dia, cartao, filtrosVisao) => itensDiaIncorporado({ data: { token, abaId: abaRef.current, dia, cartao, filtrosVisao } }),
    });
    let vivo = true;
    lerPainelIncorporado({ data: { token } })
      .then((r) => {
        if (!vivo) return;
        if (!r.valido) { setInvalido(true); return; }
        setInfo(r);
        const primeira = r.abas[0];
        abaRef.current = primeira.id;
        setAtiva(primeira.id);
        setFiltros(primeira.matriz ? [] : primeira.filtrosPadrao);
      })
      .catch(() => vivo && setInvalido(true));
    return () => { vivo = false; usarFonteIncorporada(null); };
  }, [token]);

  if (invalido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 text-center text-foreground">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold">Este link não está mais disponível</h1>
          <p className="text-sm text-muted-foreground">Ele foi revogado ou não existe. Peça um novo link à equipe Elora.</p>
        </div>
      </main>
    );
  }

  const aba = info?.abas.find((a) => a.id === ativa) ?? null;
  const trocar = (id: string) => {
    const a = info?.abas.find((x) => x.id === id);
    if (!a || id === ativa) return;
    abaRef.current = id;
    setAtiva(id);
    setFiltros(a.matriz ? [] : a.filtrosPadrao);
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background p-4 text-foreground">
      <div className="w-full min-w-0 space-y-4">
        <header className="sticky top-0 z-30 -mx-4 -mt-4 space-y-3 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {info ? <p className="min-w-0 truncate text-sm font-semibold">{info.nomeCliente}</p> : <Skeleton className="h-5 w-40" />}
            <div className="flex flex-wrap items-center gap-2">
              <SeletorPeriodo chave={chave} periodo={periodo} onMudar={(c, p) => { setChave(c); setPeriodo(p); }} />
              <a
                href="/area-do-cliente"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Abrir área do cliente
              </a>
            </div>
          </div>
          {info && info.abas.length > 1 && (
            <nav role="tablist" aria-label="Visões" className="flex flex-wrap gap-1">
              {info.abas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={a.id === ativa}
                  onClick={() => trocar(a.id)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${a.id === ativa ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {a.nome}
                </button>
              ))}
            </nav>
          )}
          {info && info.abas.length === 1 && <h1 className="truncate text-lg font-semibold">{info.abas[0].nome}</h1>}
        </header>
        {filtros.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Filtros aplicados">
            {filtros.map((f, i) => (
              <span key={`${f.fonte}|${f.campo}|${i}`} className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-xs">
                {textoSelo(f)}
                <button type="button" aria-label={`Tirar filtro ${textoSelo(f)}`} className="rounded-full text-muted-foreground hover:text-foreground" onClick={() => setFiltros((l) => l.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        {!info || !aba || !token ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : aba.cartoes.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Esta visão não tem blocos para mostrar aqui.</p>
        ) : (
          <CartoesGraficos
            key={aba.id}
            clienteId=""
            visaoId={aba.id}
            iniciais={aba.cartoes}
            editando={false}
            podeEditar={false}
            periodo={periodo}
            filtrosVisao={aba.matriz ? [] : filtros}
            onFiltroGrafico={(f) => { if (!aba.matriz) setFiltros((l) => [...l.filter((x) => !(x.fonte === f.fonte && x.campo === f.campo)), f]); }}
            outrasVisoes={[]}
            novoChave={0}
            blocosFixos={aba.matriz ? {
              [BLOCO_TABELA_MATRIZ]: <MatrizCliente clienteId="" periodo={periodo} editando={false} lerIncorporado={(a) => matrizIncorporada({ data: { token, ...a } as any })} />,
            } : undefined}
          />
        )}
      </div>
    </main>
  );
}
