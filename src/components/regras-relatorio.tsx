import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lerRegrasRelatorio, lerSuporteInterno, salvarCorteCliente, salvarFonteDados, salvarSuporteInterno } from "@/lib/indicadores.functions";
import { NAO_DEFINIDO } from "@/lib/nao-definido";

type Regras = Awaited<ReturnType<typeof lerRegrasRelatorio>>;
type Pessoa = { nome?: string | null; email?: string | null };
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pessoaDe = (t: string): Pessoa => (t.includes("@") ? { email: t.trim() } : { nome: t.trim() });

/** Regras do relatório (só super admin): suporte interno global + mapa de equipe, ignorados e fonte por cliente. */
export function RegrasRelatorio({ clienteId }: { clienteId: string }) {
  const [r, setR] = useState<Regras | null>(null);
  const [novoIgnorado, setNovoIgnorado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () =>
    lerRegrasRelatorio({ data: { clienteId } }).then(setR)
      .catch((e) => toast.error(msg(e)));
  useEffect(() => {
    void carregar();
  }, [clienteId]);

  if (!r) return <Skeleton className="h-48 w-full" />;

  const salvarCorte = async (equipePorCanal: Record<string, string>, atendentesIgnorados: Pessoa[]) => {
    setSalvando(true);
    try {
      const limpo = Object.fromEntries(Object.entries(equipePorCanal).filter(([, v]) => v.trim()));
      await salvarCorteCliente({ data: { clienteId, equipePorCanal: limpo, atendentesIgnorados } });
      setR({ ...r, equipePorCanal: limpo, atendentesIgnorados });
      toast.success("Regras salvas.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regras do relatório</CardTitle>
        <CardDescription>Valem para o relatório diário e a Matriz. Tudo é opcional: o que não for definido aparece como "{NAO_DEFINIDO}".</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">Suporte interno é definido na administração geral, em Configurar API.</p>

        {r.canais.length > 0 && (
          <section className="space-y-2">
            <Label>Equipe de cada canal (este cliente)</Label>
            <div className="space-y-1.5">
              {r.canais.map((c: { id: string; nome: string }) => (
                <div key={c.id} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm">
                  <span className="truncate">{c.nome}</span>
                  <Input
                    defaultValue={r.equipePorCanal[c.id] ?? ""}
                    placeholder={NAO_DEFINIDO}
                    className="h-8"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v === (r.equipePorCanal[c.id] ?? "")) return;
                      void salvarCorte({ ...r.equipePorCanal, [c.id]: v }, r.atendentesIgnorados);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <Label>Atendentes ignorados (este cliente)</Label>
          {r.atendentesIgnorados.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <span>{p.nome || p.email}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover" disabled={salvando}
                onClick={() => void salvarCorte(r.equipePorCanal, r.atendentesIgnorados.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={novoIgnorado} placeholder="Nome ou e-mail" onChange={(e) => setNovoIgnorado(e.target.value)} />
            <Button variant="outline" disabled={!novoIgnorado.trim() || salvando} onClick={async () => {
              await salvarCorte(r.equipePorCanal, [...r.atendentesIgnorados, pessoaDe(novoIgnorado)]);
              setNovoIgnorado("");
            }}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        </section>

        {r.temConta && (
          <section className="space-y-2">
            <Label>Fonte dos dados do painel</Label>
            <Select value={r.fonteDados} onValueChange={async (v) => {
              try {
                await salvarFonteDados({ data: { clienteId, fonte: v as "antiga" | "automatica" } });
                setR({ ...r, fonteDados: v as "antiga" | "automatica" });
                toast.success("Fonte dos dados salva.");
              } catch (e) {
                toast.error(msg(e));
              }
            }}>
              <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatica">Automática (cópia da conta)</SelectItem>
                <SelectItem value="antiga">Antiga (leitura direta)</SelectItem>
              </SelectContent>
            </Select>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

/** Global support has one editor in general administration; server checks super admin. */
export function SuporteInternoGlobal() {
  const [suporte, setSuporte] = useState<{ id: string; nome: string | null; email: string | null }[]>([]);
  const [novoSuporte, setNovoSuporte] = useState("");
  const [liberado, setLiberado] = useState(false);
  useEffect(() => { lerSuporteInterno().then(r => { setSuporte(r); setLiberado(true); }).catch(() => setLiberado(false)); }, []);
  if (!liberado) return null;
  return <div className="space-y-3 border-t pt-5">        <section className="space-y-2">
          <Label>Suporte interno (todos os clientes)</Label>
          <p className="text-xs text-muted-foreground">Conversas dessas pessoas não entram nas colunas de conversas de nenhum cliente. Por nome ou e-mail.</p>
          {suporte.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <span>{p.nome || p.email}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover" onClick={async () => {
                try {
                  await salvarSuporteInterno({ data: { acao: "remover", id: p.id } });
                  setSuporte((l) => l.filter((x) => x.id !== p.id));
                } catch (e) {
                  toast.error(msg(e));
                }
              }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={novoSuporte} placeholder="Nome ou e-mail" onChange={(e) => setNovoSuporte(e.target.value)} />
            <Button variant="outline" disabled={!novoSuporte.trim()} onClick={async () => {
              try {
                await salvarSuporteInterno({ data: { acao: "adicionar", pessoa: pessoaDe(novoSuporte) } });
                setNovoSuporte("");
                setSuporte(await lerSuporteInterno());
              } catch (e) {
                toast.error(msg(e));
              }
            }}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        </section></div>;
}
