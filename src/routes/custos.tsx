import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore, formatBRL } from "@/lib/store";
import type { CustoBase, TipoCusto } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/custos")({
  head: () => ({ meta: [{ title: "Custos · Elora" }] }),
  component: CustosPage,
});

const tipos: { value: TipoCusto; label: string }[] = [
  { value: "ferramenta", label: "Ferramenta (fixo)" },
  { value: "app", label: "App" },
  { value: "mau", label: "MAU" },
  { value: "extra", label: "Extra" },
];

function CustosPage() {
  const { custos, addCusto, updateCusto, removeCusto } = useStore();
  const [form, setForm] = useState<Omit<CustoBase, "id">>({
    nome: "", tipo: "extra", custoUnitario: 0, precoCliente: 0, unidade: "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Custos base</h1>
        <p className="text-muted-foreground text-sm">Custos da ferramenta, apps, MAU e extras</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar custo</CardTitle>
          <CardDescription>Custo unitário é o que você paga; preço cliente é o que você cobra.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label className="mb-1 block">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: TipoCusto) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Custo unit. (R$)</Label>
              <Input type="number" step="0.01" value={form.custoUnitario}
                onChange={(e) => setForm({ ...form, custoUnitario: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="mb-1 block">Preço cliente (R$)</Label>
              <Input type="number" step="0.01" value={form.precoCliente}
                onChange={(e) => setForm({ ...form, precoCliente: Number(e.target.value) })} />
            </div>
            <Button
              disabled={!form.nome}
              onClick={() => {
                addCusto(form);
                setForm({ nome: "", tipo: "extra", custoUnitario: 0, precoCliente: 0, unidade: "" });
              }}
            >
              <Plus /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lista de custos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Preço cliente</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Input value={c.nome} onChange={(e) => updateCusto(c.id, { nome: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Select value={c.tipo} onValueChange={(v: TipoCusto) => updateCusto(c.id, { tipo: v })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {tipos.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="0.01" value={c.custoUnitario}
                      onChange={(e) => updateCusto(c.id, { custoUnitario: Number(e.target.value) })}
                      className="text-right" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="0.01" value={c.precoCliente}
                      onChange={(e) => updateCusto(c.id, { precoCliente: Number(e.target.value) })}
                      className="text-right" />
                  </TableCell>
                  <TableCell className="text-right text-accent">
                    {formatBRL(c.precoCliente - c.custoUnitario)}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => removeCusto(c.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {custos.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum custo cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}