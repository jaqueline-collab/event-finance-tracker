import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { TipoMovimento } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/movimentos")({
  head: () => ({ meta: [{ title: "Movimentos · Elora" }] }),
  component: MovimentosPage,
});

const tipos: { value: TipoMovimento; label: string; color: string }[] = [
  { value: "setup", label: "Setup", color: "bg-primary/20 text-primary" },
  { value: "ativacao", label: "Ativação", color: "bg-accent/20 text-accent" },
  { value: "upgrade", label: "Upgrade", color: "bg-accent/20 text-accent" },
  { value: "downgrade", label: "Downgrade", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "ajuste", label: "Ajuste", color: "bg-muted text-muted-foreground" },
  { value: "churn", label: "Churn", color: "bg-destructive/20 text-destructive" },
  { value: "servico", label: "Serviço avulso", color: "bg-primary/20 text-primary" },
];

function MovimentosPage() {
  const { clientes, planos, movimentos, addMovimento, removeMovimento } = useStore();
  const [form, setForm] = useState({
    clienteId: clientes[0]?.id ?? "",
    data: new Date().toISOString().slice(0, 10),
    tipo: "ajuste" as TipoMovimento,
    planoId: "",
    apps: "",
    mau: "",
    valorServico: "",
    observacao: "",
  });

  const ordenados = [...movimentos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Movimentos</h1>
        <p className="text-muted-foreground text-sm">Registre cada mudança na conta do cliente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo movimento</CardTitle>
          <CardDescription>Campos em branco mantêm o valor atual do cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="mb-1 block">Cliente</Label>
              <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Data</Label>
              <Input type="date" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: TipoMovimento) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Novo plano (opc.)</Label>
              <Select value={form.planoId || "_"} onValueChange={(v) => setForm({ ...form, planoId: v === "_" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">— manter —</SelectItem>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Apps</Label>
              <Input type="number" placeholder="manter" value={form.apps}
                onChange={(e) => setForm({ ...form, apps: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">MAU</Label>
              <Input type="number" placeholder="manter" value={form.mau}
                onChange={(e) => setForm({ ...form, mau: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Valor serviço (R$)</Label>
              <Input type="number" step="0.01" placeholder="só p/ tipo Serviço"
                value={form.valorServico}
                onChange={(e) => setForm({ ...form, valorServico: e.target.value })} />
            </div>
            <div className="md:col-span-4">
              <Label className="mb-1 block">Observação</Label>
              <Textarea rows={2} value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <Button
              disabled={!form.clienteId}
              className="md:col-span-4 md:w-auto md:ml-auto"
              onClick={() => {
                addMovimento({
                  clienteId: form.clienteId,
                  data: form.data,
                  tipo: form.tipo,
                  planoId: form.planoId || undefined,
                  apps: form.apps === "" ? undefined : Number(form.apps),
                  mau: form.mau === "" ? undefined : Number(form.mau),
                  valorServico: form.valorServico === "" ? undefined : Number(form.valorServico),
                  observacao: form.observacao || undefined,
                });
                setForm({ ...form, planoId: "", apps: "", mau: "", valorServico: "", observacao: "" });
              }}
            >
              <Plus /> Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenados.map((m) => {
                const c = clientes.find((x) => x.id === m.clienteId);
                const t = tipos.find((x) => x.value === m.tipo);
                const det: string[] = [];
                if (m.planoId) det.push(`plano: ${planos.find(p => p.id === m.planoId)?.nome ?? "?"}`);
                if (m.apps !== undefined) det.push(`apps: ${m.apps}`);
                if (m.mau !== undefined) det.push(`mau: ${m.mau}`);
                if (m.valorServico !== undefined) det.push(`R$ ${m.valorServico}`);
                if (m.observacao) det.push(m.observacao);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.data}</TableCell>
                    <TableCell>{c?.nome ?? "—"}</TableCell>
                    <TableCell><Badge className={t?.color}>{t?.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{det.join(" · ") || "—"}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeMovimento(m.id)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {ordenados.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum movimento registrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}