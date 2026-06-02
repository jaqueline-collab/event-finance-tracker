import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useStore,
  formatBRL,
  receitaMensalClienteEm,
  clienteFaturaEm,
  obterVencimentoDaCompetencia,
} from "@/lib/store";
import type { LancamentoFinanceiro, StatusFinanceiro, TipoFinanceiro } from "@/lib/types";
import { Plus, Trash2, Pencil, DownloadCloud, CheckCircle2, Clock, XCircle, FileCheck2, FileX2 } from "lucide-react";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Elora" }] }),
  component: FinanceiroPage,
});

const statusOptions: { value: StatusFinanceiro; label: string; color: string; Icon: any }[] = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/15 text-yellow-500", Icon: Clock },
  { value: "pago", label: "Pago", color: "bg-accent/15 text-accent", Icon: CheckCircle2 },
  { value: "cancelado", label: "Cancelado", color: "bg-destructive/15 text-destructive", Icon: XCircle },
];

function FinanceiroPage() {
  const { financeiro, clientes, planos, custos, movimentos, addLancamento, updateLancamento, removeLancamento } = useStore();

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const today = new Date();
  const currentCompetencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const empty: Omit<LancamentoFinanceiro, "id"> = {
    descricao: "",
    tipo: "custo",
    categoria: "",
    valor: 0,
    vencimento: today.toISOString().slice(0, 10),
    competencia: currentCompetencia,
    status: "pendente",
    nfEmitida: false,
    nfNumero: "",
    observacao: "",
  };

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<LancamentoFinanceiro, "id">>(empty);
  const [open, setOpen] = useState(false);

  const startNew = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (l: LancamentoFinanceiro) => {
    setEditId(l.id);
    setForm({ ...l });
    setOpen(true);
  };

  // Auto-importar fechamentos das competências passadas que ainda não foram importadas
  const importarFechamentosAuto = () => {
    if (clientes.length === 0) return;
    const datas = clientes.map((c) => new Date(c.dataInicio));
    const minD = new Date(Math.min(...datas.map((d) => d.getTime())));
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const limite = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    let criados = 0;
    while (cursor < limite) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const competencia = `${y}-${String(m + 1).padStart(2, "0")}`;
      const jaExiste = financeiro.some((l) => l.tipo === "fechamento" && l.competencia === competencia);
      if (!jaExiste) {
        const ativos = clientes.filter((c) => clienteFaturaEm(c, y, m));
        const total = ativos.reduce((s, c) => s + receitaMensalClienteEm(c, planos, custos, movimentos, y, m), 0);
        if (ativos.length > 0) {
          // Vencimento sugerido: dia 10 do mês seguinte
          const venc = new Date(y, m + 1, 10).toISOString().slice(0, 10);
          // Ciclo: o fechamento da competência X cobre os movimentos do mês anterior
          const cy = m === 0 ? y - 1 : y;
          const cm = m === 0 ? 11 : m - 1;
          const cicloLabel = new Date(cy, cm, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
          addLancamento({
            descricao: `Fechamento Mensal ${cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · ciclo ${cicloLabel}`,
            tipo: "fechamento",
            categoria: "Receita",
            valor: Number(total.toFixed(2)),
            vencimento: venc,
            competencia,
            status: "pendente",
            nfEmitida: false,
          });
          criados++;
        }
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (criados === 0) {
      alert("Todos os fechamentos já estão importados.");
    } else {
      alert(`${criados} fechamento(s) importado(s).`);
    }
  };

  const filtrados = useMemo(() => {
    return financeiro
      .filter((l) => filtroStatus === "todos" || l.status === filtroStatus)
      .filter((l) => filtroTipo === "todos" || l.tipo === filtroTipo)
      .sort((a, b) => (b.vencimento ?? "").localeCompare(a.vencimento ?? ""));
  }, [financeiro, filtroStatus, filtroTipo]);

  const totais = useMemo(() => {
    const receitas = financeiro.filter((l) => l.tipo === "fechamento");
    const custos = financeiro.filter((l) => l.tipo === "custo");
    const sum = (arr: LancamentoFinanceiro[], st?: StatusFinanceiro) =>
      arr.filter((l) => (st ? l.status === st : true) && l.status !== "cancelado").reduce((s, l) => s + (l.valor || 0), 0);
    return {
      receitaTotal: sum(receitas),
      receitaPaga: sum(receitas, "pago"),
      receitaPendente: sum(receitas, "pendente"),
      custoTotal: sum(custos),
      custoPago: sum(custos, "pago"),
      custoPendente: sum(custos, "pendente"),
      saldo: sum(receitas) - sum(custos),
      nfPendentes: receitas.filter((l) => !l.nfEmitida && l.status !== "cancelado").length,
    };
  }, [financeiro]);

  const save = () => {
    if (!form.descricao || !form.valor) return;
    if (editId) {
      updateLancamento(editId, form);
    } else {
      addLancamento(form);
    }
    setOpen(false);
    setEditId(null);
    setForm(empty);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gestão Financeira</h1>
          <p className="text-muted-foreground text-sm">Boletos de custo, fechamentos mensais, status de pagamento e emissão de NF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importarFechamentosAuto} className="gap-2">
            <DownloadCloud className="h-4 w-4" /> Importar fechamentos
          </Button>
          <Button onClick={startNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Receitas (total)</CardDescription><CardTitle className="text-xl text-primary">{formatBRL(totais.receitaTotal)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Pago {formatBRL(totais.receitaPaga)} · Pend. {formatBRL(totais.receitaPendente)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Custos (total)</CardDescription><CardTitle className="text-xl text-yellow-500">{formatBRL(totais.custoTotal)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Pago {formatBRL(totais.custoPago)} · Pend. {formatBRL(totais.custoPendente)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Saldo previsto</CardDescription><CardTitle className={`text-xl ${totais.saldo >= 0 ? "text-accent" : "text-destructive"}`}>{formatBRL(totais.saldo)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Receita − Custo</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>NF a emitir</CardDescription><CardTitle className="text-xl">{totais.nfPendentes}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Fechamentos sem NF</CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border/60 bg-muted/10">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="custo">Custo</SelectItem>
              <SelectItem value="fechamento">Fechamento mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Toque em um lançamento para alterar o status ou marcar a emissão da NF.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((l) => {
                const s = statusOptions.find((x) => x.value === l.status) ?? statusOptions[0];
                const StatusIcon = s.Icon;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{l.descricao}</span>
                        {l.categoria && <span className="text-[10px] text-muted-foreground">{l.categoria}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {l.tipo === "fechamento" ? "Fechamento" : "Custo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.competencia ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.vencimento ? l.vencimento.split("-").reverse().join("/") : "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${l.tipo === "fechamento" ? "text-primary" : "text-yellow-500"}`}>
                      {formatBRL(l.valor)}
                    </TableCell>
                    <TableCell>
                      <Select value={l.status} onValueChange={(v) => updateLancamento(l.id, { status: v as StatusFinanceiro })}>
                        <SelectTrigger className="h-7 text-xs w-[120px]">
                          <Badge className={`${s.color} border-none gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {s.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={l.nfEmitida}
                          onCheckedChange={(v) => updateLancamento(l.id, { nfEmitida: v })}
                        />
                        {l.nfEmitida
                          ? <FileCheck2 className="h-3.5 w-3.5 text-accent" />
                          : <FileX2 className="h-3.5 w-3.5 text-muted-foreground" />}
                        {l.nfNumero && <span className="text-[10px] text-muted-foreground">#{l.nfNumero}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(l)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Excluir este lançamento?")) removeLancamento(l.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lançamento. Clique em "Importar fechamentos" ou "Novo lançamento" para começar.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: novo / editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Boleto provedor fev/26" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoFinanceiro })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custo">Custo</SelectItem>
                    <SelectItem value="fechamento">Fechamento mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Input value={form.categoria ?? ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Infraestrutura, Receita" />
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Competência (AAAA-MM)</Label>
                <Input value={form.competencia ?? ""} onChange={(e) => setForm({ ...form, competencia: e.target.value })} placeholder="2026-06" />
              </div>
              <div>
                <Label className="text-xs">Vencimento</Label>
                <Input type="date" value={form.vencimento ?? ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusFinanceiro })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3 border border-border/40 rounded-md p-3">
                <Switch checked={form.nfEmitida} onCheckedChange={(v) => setForm({ ...form, nfEmitida: v })} />
                <Label className="text-sm">NF emitida</Label>
                <Input className="ml-auto max-w-[160px]" placeholder="Nº da NF (opcional)" value={form.nfNumero ?? ""} onChange={(e) => setForm({ ...form, nfNumero: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Observação</Label>
                <Input value={form.observacao ?? ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}