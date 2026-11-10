import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { lerConfigEloraIaAdmin, salvarConfigEloraIa } from "@/lib/elora-ia.functions";
import { MODELOS_ELORA_IA, ROTULO_AREA, ROTULO_MODELO, type ConfigEloraIa, type ModeloEloraIa } from "@/lib/elora-ia";

type Dados = Awaited<ReturnType<typeof lerConfigEloraIaAdmin>>;

/** Bloco da Elora dentro de Configurar API (só super admin). */
export function EloraIaConfigCard() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [cfg, setCfg] = useState<ConfigEloraIa | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    lerConfigEloraIaAdmin()
      .then((d) => {
        setDados(d);
        setCfg(d.config);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  }, []);

  const num = (k: "limite_diario" | "max_pergunta" | "max_resposta_tokens" | "retencao_dias", rotulo: string) => (
    <div className="space-y-1">
      <Label htmlFor={`ia-${k}`}>{rotulo}</Label>
      <Input id={`ia-${k}`} type="number" value={cfg?.[k] ?? 0} onChange={(e) => setCfg((c) => (c ? { ...c, [k]: Number(e.target.value) } : c))} />
    </div>
  );

  const salvar = async () => {
    if (!cfg) return;
    setSalvando(true);
    try {
      await salvarConfigEloraIa({ data: cfg });
      toast.success("Configuração da Elora salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Elora (assistente de IA)</CardTitle>
        <CardDescription>Vale para todas as áreas do cliente e do parceiro.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cfg ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ia-ligado">Elora ligada</Label>
              <Switch id="ia-ligado" checked={cfg.ligado} onCheckedChange={(v) => setCfg({ ...cfg, ligado: v })} />
            </div>
            <div className="space-y-1">
              <Label>Modelo</Label>
              <Select value={cfg.modelo} onValueChange={(v) => setCfg({ ...cfg, modelo: v as ModeloEloraIa })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELOS_ELORA_IA.map((m) => (
                    <SelectItem key={m} value={m}>{ROTULO_MODELO[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {num("limite_diario", "Perguntas por pessoa por dia")}
              {num("max_pergunta", "Tamanho máximo da pergunta (caracteres)")}
              {num("max_resposta_tokens", "Tamanho máximo da resposta")}
              {num("retencao_dias", "Guardar histórico por (dias)")}
            </div>
            {dados && (
              <p className="text-sm text-muted-foreground">
                Últimos 30 dias: {dados.uso30.perguntas} perguntas
                {Object.entries(dados.uso30.porArea).map(([a, q]) => ` · ${ROTULO_AREA[a as keyof typeof ROTULO_AREA] ?? a}: ${q}`).join("")}
              </p>
            )}
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
