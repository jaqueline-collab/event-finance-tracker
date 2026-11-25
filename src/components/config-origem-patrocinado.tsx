import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { lerOrigemPatrocinado, salvarOrigemPatrocinado } from "@/lib/origem-patrocinado.functions";
import { NAO_DEFINIDO } from "@/lib/nao-definido";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
type Dados = Awaited<ReturnType<typeof lerOrigemPatrocinado>>;

/** Origem usada no Relatório diário e valores que contam como patrocinados. */
export function ConfigOrigemPatrocinado({ clienteId }: { clienteId: string }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [campo, setCampo] = useState("");
  const [patrocinados, setPatrocinados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    lerOrigemPatrocinado({ data: { clienteId } }).then((r) => {
      setDados(r);
      setCampo(r.config?.campo ?? "");
      setPatrocinados(r.config?.patrocinados ?? []);
    }).catch((e) => toast.error(msg(e)));
  }, [clienteId]);

  if (!dados) return null;
  const atual = dados.campos.find((c) => c.campo === campo);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarOrigemPatrocinado({ data: { clienteId, config: campo ? { campo, patrocinados } : null } });
      toast.success("Origem e patrocinados salvos.");
    } catch (e) { toast.error(msg(e)); }
    finally { setSalvando(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Origem no Relatório diário</CardTitle>
        <CardDescription>Escolha o campo de Origem e quais valores são patrocinados. Vazio e valores novos ficam como não patrocinados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Campo de Origem</Label>
          <Select value={campo || "_"} onValueChange={(v) => { setCampo(v === "_" ? "" : v); setPatrocinados([]); }}>
            <SelectTrigger aria-label="Campo de Origem"><SelectValue placeholder="Escolha o campo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Nenhum</SelectItem>
              {dados.campos.map((c) => <SelectItem key={c.campo} value={c.campo}>{c.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {atual && (
          <div className="space-y-2">
            {atual.opcoes.map((valor) => {
              const vazio = valor === NAO_DEFINIDO;
              const ligado = !vazio && patrocinados.includes(valor);
              return (
                <div key={valor} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  <span>{valor}</span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Patrocinado
                    <Switch
                      aria-label={`Patrocinado: ${valor}`}
                      checked={ligado}
                      disabled={vazio}
                      onCheckedChange={(v) => setPatrocinados((lista) => v ? [...lista, valor] : lista.filter((x) => x !== valor))}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
        <Button size="sm" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar Origem"}</Button>
      </CardContent>
    </Card>
  );
}
