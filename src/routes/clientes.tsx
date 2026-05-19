import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useStore, formatBRL, receitaMensalCliente, custoMensalCliente,
} from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Elora" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const { clientes, planos, custos, addCliente, removeCliente } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    planoId: planos[0]?.id ?? "",
    dataInicio: new Date().toISOString().slice(0, 10),
    apps: 1,
    mau: 500,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">Situação atual de cada cliente</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}><Plus /> Novo cliente</Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle>Cadastrar cliente</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <Label className="mb-1 block">Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Plano</Label>
                <Select value={form.planoId} onValueChange={(v) => setForm({ ...form, planoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Início</Label>
                <Input type="date" value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Apps</Label>
                <Input type="number" value={form.apps}
                  onChange={(e) => setForm({ ...form, apps: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="mb-1 block">MAU</Label>
                <Input type="number" value={form.mau}
                  onChange={(e) => setForm({ ...form, mau: Number(e.target.value) })} />
              </div>
              <Button
                disabled={!form.nome || !form.planoId}
                className="md:col-span-5 md:w-auto md:ml-auto"
                onClick={() => {
                  addCliente({
                    nome: form.nome,
                    planoId: form.planoId,
                    dataInicio: form.dataInicio,
                    dataChurn: null,
                    apps: form.apps,
                    mau: form.mau,
                    extras: {},
                  });
                  setForm({ ...form, nome: "" });
                  setOpen(false);
                }}
              >
                Salvar cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Carteira</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead className="text-right">Apps</TableHead>
                <TableHead className="text-right">MAU</TableHead>
                <TableHead className="text-right">Receita/mês</TableHead>
                <TableHead className="text-right">Custo/mês</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => {
                const plano = planos.find((p) => p.id === c.planoId);
                const receita = receitaMensalCliente(c, planos, custos);
                const custo = custoMensalCliente(c, planos, custos);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{plano?.nome ?? "—"}</TableCell>
                    <TableCell>
                      {c.dataChurn
                        ? <Badge variant="destructive">Churn</Badge>
                        : <Badge className="bg-accent text-accent-foreground">Ativo</Badge>}
                    </TableCell>
                    <TableCell>{c.dataInicio}</TableCell>
                    <TableCell className="text-right">{c.apps}</TableCell>
                    <TableCell className="text-right">{c.mau}</TableCell>
                    <TableCell className="text-right">{formatBRL(receita)}</TableCell>
                    <TableCell className="text-right">{formatBRL(custo)}</TableCell>
                    <TableCell className="text-right text-accent">{formatBRL(receita - custo)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeCliente(c.id)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clientes.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhum cliente. Cadastre o primeiro acima.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}