import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Undo2, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { useCurrentUserAccess } from "@/lib/permissions";
import { composicaoDoFechamento } from "@/lib/calc/composicao-fechamento";
import { composicaoInicial, linhaTotal, recalcularItem, totaisFechamento, type ComposicaoEditavel } from "@/lib/fechamento-edicao";
import { salvarEdicaoFechamento, type SalvarEdicaoInput } from "@/lib/fechamento-edicao.functions";

export const Route = createFileRoute("/financeiro_/fechamento/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar fechamento · Elora" },
      { name: "description", content: "Edição de um fechamento mensal já gerado." },
      { property: "og:title", content: "Editar fechamento · Elora" },
      { property: "og:description", content: "Edição de um fechamento mensal já gerado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditarFechamento,
});

type Lanc = { status: "pago" | "pendente" | "cancelado"; nfEmitida: boolean; nfNumero: string | null };
type ItemForm = {
  id: string; clienteId: string; clienteNome: string; planoId: string | null; planoNome: string | null;
  cicloInicio: string | null; cicloFim: string | null; vencimento: string | null; valorDesconto: number;
  composicao: ComposicaoEditavel; lancamentoFinanceiroId: string | null; lancamento: Lanc | null;
  removido?: boolean; novo?: boolean; brutoOriginal: number; liquidoOriginal: number;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: string) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

function EditarFechamento() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const access = useCurrentUserAccess();
  const { fechamentos, fechamentoItens, clientes, planos, movimentos, financeiro, syncFromSupabase } = useStore();
  const salvar = useServerFn(salvarEdicaoFechamento);
  const fech = fechamentos.find((f) => f.id === id);

  const [cab, setCab] = useState<{ titulo: string; descricao: string; observacao: string; competencia: string } | null>(null);
  const [itens, setItens] = useState<ItemForm[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState<null | { tipo: "remover"; idx: number } | { tipo: "incluir" }>(null);
  const [aviso, setAviso] = useState<null | { parceiro: boolean; nfs: string[] }>(null);
  const [novoCliente, setNovoCliente] = useState("");

  useEffect(() => {
    if (!fech || cab) return;
    setCab({ titulo: fech.titulo, descricao: fech.descricao ?? "", observacao: fech.observacao ?? "", competencia: fech.competencia });
    const its = fechamentoItens.filter((i) => i.fechamentoId === id).map<ItemForm>((it) => {
      const cli = clientes.find((c) => c.id === it.clienteId);
      const comp = composicaoDoFechamento(it, cli, planos, movimentos);
      const snap = (it.payloadSnapshot ?? {}) as Record<string, unknown>;
      const l = financeiro.find((x) => x.id === it.lancamentoFinanceiroId);
      return {
        id: it.id, clienteId: it.clienteId, clienteNome: cli?.nome ?? String(snap["clienteNome"] ?? it.clienteId),
        planoId: it.planoId ?? null, planoNome: comp.planoNome, cicloInicio: it.cicloInicio ?? null, cicloFim: it.cicloFim ?? null,
        vencimento: it.vencimento ?? null, valorDesconto: it.valorDesconto,
        composicao: composicaoInicial(snap, comp.fonte === "reconstruida" ? comp.itens : null, it.valorBruto),
        lancamentoFinanceiroId: it.lancamentoFinanceiroId ?? null,
        lancamento: l ? { status: l.status, nfEmitida: l.nfEmitida, nfNumero: l.nfNumero ?? null } : null,
        brutoOriginal: it.valorBruto, liquidoOriginal: it.valorLiquido,
      };
    }).sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));
    setItens(its);
  }, [fech, cab, fechamentoItens, clientes, planos, movimentos, financeiro, id]);

  const calc = useMemo(() => (itens ?? []).map((it) => recalcularItem(it.composicao, it.valorDesconto)), [itens]);
  const tot = useMemo(() => totaisFechamento(calc.map((c, i) => ({ ...c, removido: itens?.[i]?.removido }))), [calc, itens]);

  if (access.loading && !fech) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (!access.isAdmin) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Lock className="h-4 w-4" /> Só administradores podem editar fechamentos.</div>;
  if (!fech || !cab || !itens) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando fechamento…</div>;

  const upd = (i: number, p: Partial<ItemForm>) => setItens((xs) => xs!.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const updComp = (i: number, p: Partial<ComposicaoEditavel>) => setItens((xs) => xs!.map((x, k) => (k === i ? { ...x, composicao: { ...x.composicao, ...p } } : x)));

  const clientesFora = clientes
    .filter((c) => !itens.some((it) => it.clienteId === c.id && !it.removido))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const incluir = () => {
    const c = clientes.find((x) => x.id === novoCliente);
    if (!c) return;
    const plano = planos.find((p) => p.id === c.planoId);
    const sist = plano ? Number((plano as any).valorBase ?? (plano as any).valor ?? 0) : 0;
    const acomp = Number(plano?.valorAcompanhamento ?? 0);
    setItens((xs) => [...xs!, {
      id: crypto.randomUUID(), clienteId: c.id, clienteNome: c.nome, planoId: c.planoId ?? null, planoNome: plano?.nome ?? null,
      cicloInicio: xs![0]?.cicloInicio ?? null, cicloFim: xs![0]?.cicloFim ?? null, vencimento: xs![0]?.vencimento ?? null,
      valorDesconto: 0,
      composicao: { linhas: sist ? [{ label: "Sistema", qtd: 1, unit: sist, total: sist }] : [], acompanhamentoOriginal: acomp, acompanhamentoIsento: false, mauExcedenteValor: 0 },
      lancamentoFinanceiroId: null, lancamento: { status: "pendente", nfEmitida: false, nfNumero: null }, novo: true, brutoOriginal: 0, liquidoOriginal: 0,
    }]);
    setNovoCliente("");
  };

  const payload = (confirmouParceiro: boolean, confirmouNF: boolean): SalvarEdicaoInput => ({
    fechamentoId: id, motivo: motivo.trim() || null, confirmouParceiro, confirmouNF,
    cabecalho: { titulo: cab.titulo, descricao: cab.descricao || null, observacao: cab.observacao || null, competencia: cab.competencia },
    itens: itens.map((it) => ({
      id: it.id, clienteId: it.clienteId, clienteNome: it.clienteNome, planoId: it.planoId, planoNome: it.planoNome,
      cicloInicio: it.cicloInicio || null, cicloFim: it.cicloFim || null, vencimento: it.vencimento || null,
      valorDesconto: it.valorDesconto, composicao: { ...it.composicao, linhas: it.composicao.linhas.map((l) => ({ ...l, total: linhaTotal(l) })) },
      lancamentoFinanceiroId: it.lancamentoFinanceiroId, removido: it.removido, novo: it.novo, lancamento: it.lancamento,
    })),
  });

  const nfsAfetadas = () => itens.filter((it, i) => {
    if (it.novo || !it.lancamento?.nfEmitida) return false;
    const l = financeiro.find((x) => x.id === it.lancamentoFinanceiroId);
    return it.removido || (l && Math.abs(Number(l.valor) - calc[i].valorLiquido) >= 0.01);
  }).map((it, _i) => {
    const l = financeiro.find((x) => x.id === it.lancamentoFinanceiroId);
    const idx = itens.indexOf(it);
    return `${it.clienteNome}: NF ${l?.nfNumero || "s/ nº"} de ${brl(Number(l?.valor ?? 0))} → ${it.removido ? "item removido" : brl(calc[idx].valorLiquido)}`;
  });

  const tentarSalvar = () => {
    const parceiro = Boolean(fech.enviadoParceiroEm);
    const nfs = nfsAfetadas();
    if (parceiro || nfs.length) { setAviso({ parceiro, nfs }); return; }
    void gravar(false, false);
  };

  const gravar = async (cp: boolean, cn: boolean) => {
    setSalvando(true);
    try {
      const r = await salvar({ data: payload(cp, cn) });
      if (!r.ok) { setAviso({ parceiro: r.confirmacao === "confirmacao-parceiro", nfs: r.confirmacao === "confirmacao-nf" ? [r.mensagem] : [] }); return; }
      toast.success(r.alteracoes ? `Fechamento salvo (${r.alteracoes} alteração(ões)).` : "Nada mudou.");
      await syncFromSupabase();
      navigate({ to: "/financeiro", search: { aba: "fechamento" } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6 pb-28">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/financeiro" search={{ aba: "fechamento" }}><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
        <h1 className="text-xl font-semibold">Editar fechamento</h1>
        {fech.enviadoParceiroEm && <Badge variant="outline" className="border-primary/40 text-primary">Liberado ao parceiro</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Fechamento</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label>Título</Label><Input value={cab.titulo} onChange={(e) => setCab({ ...cab, titulo: e.target.value })} /></div>
          <div className="space-y-1"><Label>Competência</Label><Input type="month" value={cab.competencia} onChange={(e) => setCab({ ...cab, competencia: e.target.value })} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={cab.descricao} onChange={(e) => setCab({ ...cab, descricao: e.target.value })} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Observação</Label><Textarea rows={2} value={cab.observacao} onChange={(e) => setCab({ ...cab, observacao: e.target.value })} /></div>
        </CardContent>
      </Card>

      {itens.map((it, i) => {
        const c = calc[i];
        if (it.removido) {
          return (
            <Card key={it.id} className="opacity-60">
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span><strong>{it.clienteNome}</strong> será removido (fica guardado no histórico).</span>
                <Button size="sm" variant="outline" onClick={() => upd(i, { removido: false })}><Undo2 className="h-4 w-4" /> Desfazer</Button>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card key={it.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{it.clienteNome} {it.novo && <Badge variant="outline" className="ml-1">novo</Badge>}</CardTitle>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmar({ tipo: "remover", idx: i })}><Trash2 className="h-4 w-4" /> Remover</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Plano</Label>
                  <Select value={it.planoId ?? ""} onValueChange={(v) => upd(i, { planoId: v, planoNome: planos.find((p) => p.id === v)?.nome ?? null })}>
                    <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                    <SelectContent>{planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Ciclo início</Label><Input type="date" value={it.cicloInicio ?? ""} onChange={(e) => upd(i, { cicloInicio: e.target.value || null })} /></div>
                <div className="space-y-1"><Label>Ciclo fim</Label><Input type="date" value={it.cicloFim ?? ""} onChange={(e) => upd(i, { cicloFim: e.target.value || null })} /></div>
                <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={it.vencimento ?? ""} onChange={(e) => upd(i, { vencimento: e.target.value || null })} /></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1">Linha da composição</th><th className="w-24">Qtd</th><th className="w-32">Unitário</th><th className="w-28 text-right">Total</th><th className="w-10" /></tr></thead>
                  <tbody>
                    {it.composicao.linhas.map((l, k) => (
                      <tr key={k} className="border-t border-border/30">
                        <td className="py-1 pr-2"><Input value={l.label} onChange={(e) => updComp(i, { linhas: it.composicao.linhas.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} /></td>
                        <td className="pr-2"><Input inputMode="decimal" value={String(l.qtd)} onChange={(e) => updComp(i, { linhas: it.composicao.linhas.map((x, j) => (j === k ? { ...x, qtd: num(e.target.value) } : x)) })} /></td>
                        <td className="pr-2"><Input inputMode="decimal" value={String(l.unit)} onChange={(e) => updComp(i, { linhas: it.composicao.linhas.map((x, j) => (j === k ? { ...x, unit: num(e.target.value) } : x)) })} /></td>
                        <td className="text-right tabular-nums">{brl(linhaTotal(l))}</td>
                        <td><Button size="icon" variant="ghost" aria-label="Remover linha" onClick={() => updComp(i, { linhas: it.composicao.linhas.filter((_, j) => j !== k) })}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                    <tr className="border-t border-border/30">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          {it.composicao.acompanhamentoIsento ? "Acompanhamento (isento)" : "Acompanhamento"}
                          <label className="ml-2 flex items-center gap-1 text-xs text-muted-foreground"><Switch checked={it.composicao.acompanhamentoIsento} onCheckedChange={(v) => updComp(i, { acompanhamentoIsento: v })} /> Isento</label>
                        </div>
                      </td>
                      <td colSpan={2} className="pr-2"><Input inputMode="decimal" aria-label="Valor original do acompanhamento" value={String(it.composicao.acompanhamentoOriginal)} onChange={(e) => updComp(i, { acompanhamentoOriginal: num(e.target.value) })} /></td>
                      <td className="text-right tabular-nums">{brl(c.acompanhamento)}</td><td />
                    </tr>
                    <tr className="border-t border-border/30">
                      <td className="py-2">Excedente de contatos</td>
                      <td colSpan={2} className="pr-2"><Input inputMode="decimal" value={String(it.composicao.mauExcedenteValor)} onChange={(e) => updComp(i, { mauExcedenteValor: num(e.target.value) })} /></td>
                      <td className="text-right tabular-nums">{brl(it.composicao.mauExcedenteValor)}</td><td />
                    </tr>
                  </tbody>
                </table>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => updComp(i, { linhas: [...it.composicao.linhas, { label: "Nova linha", qtd: 1, unit: 0, total: 0 }] })}><Plus className="h-4 w-4" /> Incluir linha</Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 rounded-md bg-muted/30 p-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Bruto</div><div className="font-medium tabular-nums">{brl(c.valorBruto)}</div>{!it.novo && Math.abs(c.valorBruto - it.brutoOriginal) >= 0.01 && <div className="text-xs text-muted-foreground">antes {brl(it.brutoOriginal)}</div>}</div>
                <div className="space-y-1"><Label className="text-xs">Desconto</Label><Input inputMode="decimal" value={String(it.valorDesconto)} onChange={(e) => upd(i, { valorDesconto: Math.max(0, num(e.target.value)) })} /></div>
                <div><div className="text-xs text-muted-foreground">Líquido</div><div className="font-semibold tabular-nums">{brl(c.valorLiquido)}</div>{!it.novo && Math.abs(c.valorLiquido - it.liquidoOriginal) >= 0.01 && <div className="text-xs text-muted-foreground">antes {brl(it.liquidoOriginal)}</div>}</div>
              </div>

              {it.lancamento && (
                <div className="grid gap-3 sm:grid-cols-3 border-t border-border/40 pt-3">
                  <div className="text-xs text-muted-foreground sm:col-span-3">Lançamento financeiro: valor acompanha o líquido do item; vencimento segue o do item.</div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={it.lancamento.status} onValueChange={(v) => upd(i, { lancamento: { ...it.lancamento!, status: v as Lanc["status"] } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm pt-6"><Switch checked={it.lancamento.nfEmitida} onCheckedChange={(v) => upd(i, { lancamento: { ...it.lancamento!, nfEmitida: v } })} /> NF emitida</label>
                  <div className="space-y-1"><Label>Nº da NF</Label><Input value={it.lancamento.nfNumero ?? ""} onChange={(e) => upd(i, { lancamento: { ...it.lancamento!, nfNumero: e.target.value || null } })} /></div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Incluir cliente que ficou de fora</Label>
            <Select value={novoCliente} onValueChange={setNovoCliente}>
              <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
              <SelectContent>{clientesFora.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={!novoCliente} onClick={() => setConfirmar({ tipo: "incluir" })}><Plus className="h-4 w-4" /> Incluir</Button>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 p-3 md:flex-row md:items-center">
          <div className="text-sm tabular-nums">Bruto {brl(tot.totalBruto)} · Desconto {brl(tot.totalDesconto)} · <strong>Líquido {brl(tot.totalLiquido)}</strong> <span className="text-muted-foreground">(antes {brl(fech.totalLiquido)})</span></div>
          <Input className="md:ml-auto md:max-w-xs" placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <Button onClick={tentarSalvar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
        </div>
      </div>

      <AlertDialog open={Boolean(confirmar)} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar?.tipo === "remover" ? "Remover este item?" : "Incluir este cliente?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar?.tipo === "remover"
                ? "O item sai dos totais, do PDF e da visão do parceiro, e o lançamento ligado fica cancelado. Nada é apagado: o item antigo fica guardado. Só vale depois de Salvar."
                : "O cliente entra com o plano atual como ponto de partida; ajuste a composição antes de salvar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmar?.tipo === "remover") {
                const it = itens[confirmar.idx];
                if (it.novo) setItens((xs) => xs!.filter((_, k) => k !== confirmar.idx));
                else upd(confirmar.idx, { removido: true });
              } else incluir();
              setConfirmar(null);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(aviso)} onOpenChange={(o) => !o && setAviso(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Confirme antes de salvar</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {aviso?.parceiro && <p>Este fechamento já foi liberado ao parceiro. A edição aparece imediatamente na visão dele.</p>}
                {aviso && aviso.nfs.length > 0 && (
                  <div>
                    <p>Há NF já emitida que deixará de refletir o valor do lançamento:</p>
                    <ul className="list-disc pl-5">{aviso.nfs.map((n) => <li key={n}>{n}</li>)}</ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setAviso(null); void gravar(true, true); }}>Salvar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
