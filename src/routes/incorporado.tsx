import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CartoesGraficos, usarFonteIncorporada } from "@/components/cartoes-graficos";
import { SeletorPeriodo } from "@/components/painel-visual";
import { calcularPainelIncorporado, itensDiaIncorporado, lerPainelIncorporado } from "@/lib/incorporar.functions";
import { periodoDe, type Periodo, type PeriodoChave } from "@/lib/painel-visual";
import { textoSelo } from "@/lib/filtros-fixos";
import type { FiltroCampo } from "@/lib/campos-elora";

export const Route = createFileRoute("/incorporado/$token")({
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
  const { token } = Route.useParams();
  const { tema } = Route.useSearch();
  const [info, setInfo] = useState<Info | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [chave, setChave] = useState<PeriodoChave>("30d");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDe("30d", new Date().toISOString()));
  const [filtros, setFiltros] = useState<FiltroCampo[]>([]);

  useEffect(() => {
    if (tema) document.documentElement.classList.toggle("dark", tema === "escuro");
  }, [tema]);

  useEffect(() => {
    usarFonteIncorporada({
      calcular: (a, cartoes) => calcularPainelIncorporado({ data: { token, de: a.de, ate: a.ate, filtrosVisao: a.filtrosVisao, cartoes } }) as Promise<Record<string, unknown>>,
      itensDia: (dia, cartao, filtrosVisao) => itensDiaIncorporado({ data: { token, dia, cartao, filtrosVisao } }),
    });
    let vivo = true;
    lerPainelIncorporado({ data: { token } })
      .then((r) => { if (!vivo) return; if (!r.valido) setInvalido(true); else { setInfo(r); setFiltros(r.filtrosPadrao); } })
      .catch(() => vivo && setInvalido(true));
    return () => { vivo = false; usarFonteIncorporada(null); };
  }, [token]);

  if (invalido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold">Este link não está mais disponível</h1>
          <p className="text-sm text-muted-foreground">Ele foi revogado ou não existe. Peça um novo link à equipe Elora.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          {info ? (
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{info.nomeCliente}</p>
              <h1 className="truncate text-lg font-semibold sm:text-xl">{info.nomeVisao}</h1>
            </div>
          ) : <Skeleton className="h-10 w-48" />}
          <SeletorPeriodo chave={chave} periodo={periodo} onMudar={(c, p) => { setChave(c); setPeriodo(p); }} />
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
        {!info ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : info.cartoes.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Esta visão não tem blocos para mostrar aqui.</p>
        ) : (
          <CartoesGraficos
            clienteId=""
            visaoId="incorporado"
            iniciais={info.cartoes}
            editando={false}
            podeEditar={false}
            periodo={periodo}
            filtrosVisao={filtros}
            onFiltroGrafico={(f) => setFiltros((l) => [...l.filter((x) => !(x.fonte === f.fonte && x.campo === f.campo)), f])}
            outrasVisoes={[]}
            novoChave={0}
          />
        )}
      </div>
    </main>
  );
}
