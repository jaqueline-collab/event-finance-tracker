import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPainelVisual } from "@/lib/painel-visual.functions";
import { FiltroCampos } from "@/components/filtro-campos";
import { separarFiltros, type FiltroCampo, type FonteCampo } from "@/lib/campos-elora";
import {
  DIMENSOES,
  ROTULO_PERIODO,
  periodoDe,
  type Dimensao,
  type Periodo,
  type PeriodoChave,
} from "@/lib/painel-visual";

/** Dimensões que o painel aplica direto; o resto do catálogo liga pelo contato. */
export const NATIVOS_PAINEL: Record<Dimensao, { fonte: FonteCampo; campo: string }> = {
  canal: { fonte: "atendimento", campo: "canal" },
  atendente: { fonte: "atendimento", campo: "atendente" },
  origem: { fonte: "contato", campo: "origem" },
  etiqueta: { fonte: "contato", campo: "etiquetas" },
  campanha: { fonte: "utm", campo: "campaign" },
};

type Dados = Extract<Awaited<ReturnType<typeof getPainelVisual>>, { disponivel: true }>;

const nf = new Intl.NumberFormat("pt-BR");
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;

/* ---------------- Cabeçalho e período ---------------- */

export function SeletorPeriodo({
  chave,
  periodo,
  onMudar,
}: {
  chave: PeriodoChave;
  periodo: Periodo;
  onMudar: (c: PeriodoChave, p: Periodo) => void;
}) {
  const [de, setDe] = useState(periodo.de);
  const [ate, setAte] = useState(periodo.ate);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    setDe(periodo.de);
    setAte(periodo.ate);
  }, [periodo.de, periodo.ate]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={chave === "personalizado" ? "__atual" : chave}
        onValueChange={(v) => {
          const c = v as PeriodoChave;
          if (c === "personalizado") return setAberto(true);
          onMudar(c, periodoDe(c, new Date().toISOString()));
        }}
      >
        <SelectTrigger className="h-10 w-auto gap-2 bg-card" aria-label="Período">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            <span className="hidden sm:inline">{ROTULO_PERIODO[chave]} · </span>
            {dataBr(periodo.de)} a {dataBr(periodo.ate)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {(Object.keys(ROTULO_PERIODO) as PeriodoChave[]).map((k) => (
            <SelectItem key={k} value={k}>
              {ROTULO_PERIODO[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <p className="text-sm font-medium">Período personalizado</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              De
              <Input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Até
              <Input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
            </label>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!de || !ate || de > ate}
            onClick={() => {
              onMudar("personalizado", { de, ate });
              setAberto(false);
            }}
          >
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------------- Painel ---------------- */

export function PainelVisual({
  clienteId,
  periodo,
  filtros,
  onFiltros,
  editando,
  ocultos = [],
  onAlternarOculto,
  onDisponivel,
}: {
  clienteId: string;
  periodo: Periodo;
  filtros: FiltroCampo[];
  onFiltros: (f: FiltroCampo[]) => void;
  editando?: boolean;
  /** Cartões ocultos do cliente nesta visão (só some fora do modo Editar). */
  ocultos?: string[];
  onAlternarOculto?: (id: string) => void;
  onDisponivel?: (sim: boolean) => void;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const chaveFiltros = JSON.stringify(filtros);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    const { diretos, outros } = separarFiltros(filtros, NATIVOS_PAINEL);
    getPainelVisual({ data: { clienteId, de: periodo.de, ate: periodo.ate, filtros: diretos, campos: outros } })
      .then((r) => {
        if (!vivo) return;
        if (!r.disponivel) setIndisponivel(true);
        else setDados(r as Dados);
        onDisponivel?.(r.disponivel);
      })
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, periodo.de, periodo.ate, chaveFiltros]);

  if (indisponivel) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FiltroCampos
          clienteId={clienteId}
          filtros={filtros}
          onFiltros={onFiltros}
          fonteDaVisao="varias"
          opcoesNativas={Object.fromEntries(DIMENSOES.map((d) => [`${NATIVOS_PAINEL[d.chave].fonte}|${NATIVOS_PAINEL[d.chave].campo}`, dados?.opcoes[d.chave] ?? []]))}
        />
        {dados?.ultimaSync && (
          <span className="ml-auto text-sm text-muted-foreground" title={new Date(dados.ultimaSync).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}>
            atualizado {haQuanto(dados.ultimaSync)}
          </span>
        )}
      </div>

      {erro && !dados && (
        <p className="rounded-xl border bg-card p-6 text-sm text-destructive">Não foi possível carregar o painel: {erro}</p>
      )}

      {!dados && !erro ? (
        <EsqueletoPainel />
      ) : dados ? (
        <div className={`space-y-5 transition-opacity duration-300 ${carregando ? "opacity-60" : "opacity-100"}`} aria-busy={carregando}>
          {/* Indicadores são só blocos da visão (filtros.cartoes); aqui fica apenas o aviso único de cobertura. */}
          {dados.cobertura !== "confirmado" && <p className="text-xs text-muted-foreground">{dados.cobertura} · cobertura diária não confirmada</p>}

        </div>
      ) : null}
    </div>
  );
}

function haQuanto(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function EsqueletoPainel() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

/* ---------------- Chips ---------------- */



