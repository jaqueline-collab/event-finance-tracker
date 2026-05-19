import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore, formatBRL } from "@/lib/store";
import type { Plano } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/planos")({
  head: () => ({ meta: [{ title: "Planos · Elora" }] }),
  component: PlanosPage,
});

function PlanosPage() {
  const { planos, addPlano, updatePlano, removePlano } = useStore();
  const [form, setForm] = useState<Omit<Plano, "id">>({
    nome: "", valorMensal: 0, valorSetup: 0, appsInclusos: 1, mauInclusos: 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Planos</h1>
        <p className="text-muted-foreground text-sm">Pacotes comerciais e o que está incluso</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo plano</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label className="mb-1 block">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Mensal (R$)</Label>
              <Input type="number" step="0.01" value={form.valorMensal}
                onChange={(e) => setForm({ ...form, valorMensal: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="mb-1 block">Setup (R$)</Label>
              <Input type="number" step="0.01" value={form.valorSetup}
                onChange={(e) => setForm({ ...form, valorSetup: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="mb-1 block">Apps inclusos</Label>
              <Input type="number" value={form.appsInclusos}
                onChange={(e) => setForm({ ...form, appsInclusos: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="mb-1 block">MAU inclusos</Label>
              <Input type="number" value={form.mauInclusos}
                onChange={(e) => setForm({ ...form, mauInclusos: Number(e.target.value) })} />
            </div>
            <Button
              disabled={!form.nome}
              className="md:col-span-6 md:w-auto md:ml-auto"
              onClick={() => {
                addPlano(form);
                setForm({ nome: "", valorMensal: 0, valorSetup: 0, appsInclusos: 1, mauInclusos: 500 });
              }}
            >
              <Plus /> Adicionar plano
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Planos cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Mensal</TableHead>
                <TableHead className="text-right">Setup</TableHead>
                <TableHead className="text-right">Apps</TableHead>
                <TableHead className="text-right">MAU</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><Input value={p.nome} onChange={(e) => updatePlano(p.id, { nome: e.target.value })} /></TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="0.01" value={p.valorMensal} className="text-right"
                      onChange={(e) => updatePlano(p.id, { valorMensal: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="0.01" value={p.valorSetup} className="text-right"
                      onChange={(e) => updatePlano(p.id, { valorSetup: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" value={p.appsInclusos} className="text-right"
                      onChange={(e) => updatePlano(p.id, { appsInclusos: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" value={p.mauInclusos} className="text-right"
                      onChange={(e) => updatePlano(p.id, { mauInclusos: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => removePlano(p.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {planos.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum plano.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Valores formatados: {planos.map((p) => `${p.nome}: ${formatBRL(p.valorMensal)}/mês`).join(" · ")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}