import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { lerCatalogoConfig, salvarAjusteCampo } from "@/lib/campos-elora.functions";
import type { CampoCatalogo, GrupoCatalogo, TipoCampo } from "@/lib/campos-elora";

const TIPO: Record<TipoCampo, string> = { texto: "Texto", numero: "Número", data: "Data", lista: "Lista", simnao: "Sim/não", moeda: "Moeda" };
const USO = { filtro: "Filtro", coluna: "Coluna", grafico: "Gráfico" } as const;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Configurar → Campos do Elora: renomear e ocultar campos deste cliente. */
export function CamposEloraConfig({ clienteId }: { clienteId: string }) {
  const [grupos, setGrupos] = useState<GrupoCatalogo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let vivo = true;
    lerCatalogoConfig({ data: { clienteId } })
      .then((r) => vivo && setGrupos(r.grupos))
      .catch((e) => vivo && setErro(msg(e)));
    return () => {
      vivo = false;
    };
  }, [clienteId]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!grupos || !q) return grupos;
    return grupos.map((g) => ({ ...g, campos: g.campos.filter((c) => `${c.rotulo} ${c.nome}`.toLowerCase().includes(q)) })).filter((g) => g.campos.length);
  }, [grupos, busca]);

  const gravar = async (c: CampoCatalogo, patch: Partial<Pick<CampoCatalogo, "rotulo" | "oculto">>) => {
    const novo = { ...c, ...patch };
    setGrupos((gs) => gs?.map((g) => ({ ...g, campos: g.campos.map((x) => (x.fonte === c.fonte && x.campo === c.campo ? novo : x)) })) ?? gs);
    try {
      await salvarAjusteCampo({ data: { clienteId, fonte: c.fonte, campo: c.campo, rotulo: novo.rotulo === novo.nome ? null : novo.rotulo, oculto: novo.oculto } });
    } catch (e) {
      toast.error(msg(e));
    }
  };

  if (erro) return <p className="text-sm text-muted-foreground">Não foi possível carregar os campos agora.</p>;
  if (!filtrados) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Campos que este cliente tem no Elora, vindos da sincronização. Renomeie o nome exibido ou oculte o que não quer oferecer em filtros e colunas. Só a equipe vê esta tela.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar campo" className="pl-9" />
      </div>
      {filtrados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum campo encontrado.</p>}
      {filtrados.map((g) => (
        <section key={g.fonte} className="space-y-2">
          <h3 className="text-sm font-semibold">
            {g.nome} <span className="font-normal text-muted-foreground">({g.campos.length})</span>
          </h3>
          <ul className="divide-y rounded-xl border bg-card">
            {g.campos.map((c) => (
              <LinhaCampo key={c.campo} c={c} onSalvar={(p) => gravar(c, p)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LinhaCampo({ c, onSalvar }: { c: CampoCatalogo; onSalvar: (p: Partial<Pick<CampoCatalogo, "rotulo" | "oculto">>) => void }) {
  const [t, setT] = useState(c.rotulo);
  useEffect(() => setT(c.rotulo), [c.rotulo]);
  return (
    <li className={`flex flex-wrap items-center gap-2 px-3 py-2.5 ${c.oculto ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1 basis-48">
        <Input
          value={t}
          maxLength={80}
          onChange={(e) => setT(e.target.value)}
          onBlur={() => t.trim() !== c.rotulo && onSalvar({ rotulo: t.trim() || c.nome })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8"
          aria-label={`Nome exibido de ${c.nome}`}
        />
        {t !== c.nome && <p className="mt-0.5 truncate text-xs text-muted-foreground">Original: {c.nome}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary">{TIPO[c.tipo]}</Badge>
        {c.usos.map((u) => (
          <Badge key={u} variant="outline" className="font-normal">
            {USO[u]}
          </Badge>
        ))}
        <span className="text-xs tabular-nums text-muted-foreground">{c.preenchidos.toLocaleString("pt-BR")} preenchidos</span>
      </div>
      <button
        type="button"
        onClick={() => onSalvar({ oculto: !c.oculto })}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={c.oculto ? `Mostrar ${c.rotulo}` : `Ocultar ${c.rotulo}`}
        title={c.oculto ? "Oculto: clique para oferecer" : "Disponível: clique para ocultar"}
      >
        {c.oculto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </li>
  );
}
