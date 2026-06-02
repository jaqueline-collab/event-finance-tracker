import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore, formatBRL, receitaMensalCliente, custoMensalCliente, calcularCustoExtraUsuariosHelena, calcularCustoExtraContatosHelena, formatDiaVencimento } from "@/lib/store";
import { Plus, Trash2, MoreVertical, Settings2, XCircle, Info, TrendingUp, TrendingDown, DollarSign, Zap, Pencil } from "lucide-react";
import type { TipoMovimento, Cliente, Movimento } from "@/lib/types";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Elora" }] }),
  component: ClientesPage,
});

const tiposMovimento: { value: TipoMovimento; label: string; color: string }[] = [
  { value: "setup", label: "Setup / Ativação", color: "bg-primary/20 text-primary" },
  { value: "upgrade", label: "Upgrade", color: "bg-accent/20 text-accent" },
  { value: "downgrade", label: "Downgrade", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "churn", label: "Churn", color: "bg-destructive/20 text-destructive" },
  { value: "servico", label: "Serviço avulso", color: "bg-primary/20 text-primary" },
];

function ClientesPage() {
  const { clientes, planos, custos, movimentos, parceiros, addCliente, removeCliente, addMovimento, removeMovimento } = useStore();
  const [open, setOpen] = useState(false);
  
  // Modal de Ação (Movimento)
  const [acaoClienteId, setAcaoClienteId] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [editMovId, setEditMovId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    nome: "",
    planoId: planos[0]?.id ?? "",
    parceiroId: planos[0]?.parceiroIds?.[0] ?? "",
    dataInicio: new Date().toISOString().slice(0, 10),
    dataVencimento: "",
    canais: 1,
    canaisWhats: 1,
    canaisInsta: 0,
    canaisMessenger: 0,
    canaisZapi: 0,
    usuariosAtivos: 3,
    contatosAtivos: 500,
    agentesIA: false,
    asaas: false,
    zapi: false,
    transcricaoIA: false,
    valorSetupPago: 0,
    valorAcompanhamento: 0,
  });

  const [movForm, setMovForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "upgrade" as TipoMovimento,
    planoId: "",
    canaisWhats: "",
    canaisInsta: "",
    canaisMessenger: "",
    canaisZapi: "",
    usuariosAtivos: "",
    contatosAtivos: "",
    agentesIA: false,
    asaas: false,
    zapi: false,
    transcricaoIA: false,
    observacao: "",
    valorSetupPago: "",
    valorAcompanhamento: "",
  });

  // Real-time pricing calculations for the chosen form state
  const selectedPlano = useMemo(() => planos.find(p => p.id === form.planoId), [planos, form.planoId]);

  const realTimePricing = useMemo(() => {
    if (!selectedPlano) return { base: 0, extraCanais: 0, extraCanaisQtd: 0, extraUsers: 0, extraContatos: 0, zapi: 0, ia: 0, asaas: 0, transcricao: 0, custoTotal: 0, receitaTotal: 0, lucroTotal: 0, faturamentoBase: 0, faturamentoCanaisExc: 0, faturamentoUsersExc: 0, faturamentoContatosExc: 0, faturamentoZapi: 0, faturamentoIA: 0, faturamentoAsaas: 0, faturamentoTranscricao: 0 };
    
    // Helena cost prices
    const baseLicenceCost = selectedPlano.licencaBase ?? 149.90;
    const precoCanalWhatsExc = selectedPlano.precoCanalWhatsExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoCanalInstaExc = selectedPlano.precoCanalInstaExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoCanalMessengerExc = selectedPlano.precoCanalMessengerExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoUsuariosExc = selectedPlano.precoUsuariosExc ?? 19.90;
    const precoContatosExc = selectedPlano.precoContatosExc ?? 0.045;
    const precoIA = selectedPlano.precoIA ?? 50.00;
    const precoAsaas = selectedPlano.precoAsaas ?? 49.50;
    const precoZapi = selectedPlano.precoZapi ?? 69.00;
    const precoTranscricaoUser = selectedPlano.precoTranscricaoUser ?? 3.99;

    // Commercial sell prices
    const valorCanalWhatsExc = selectedPlano.valorCanalWhatsExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorCanalInstaExc = selectedPlano.valorCanalInstaExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorCanalMessengerExc = selectedPlano.valorCanalMessengerExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorUsuariosExc = selectedPlano.valorUsuariosExc ?? 39.90;
    const valorContatosExc = selectedPlano.valorContatosExc ?? 0.10;
    const valorIA = selectedPlano.valorIA ?? 99.00;
    const valorAsaas = selectedPlano.valorAsaas ?? 89.00;
    const valorZapi = selectedPlano.valorZapi ?? 149.00;
    const valorTranscricaoUser = selectedPlano.valorTranscricaoUser ?? 7.99;

    // Derive channel counts
    const canaisWhats = form.canaisWhats !== undefined ? form.canaisWhats : (form.canaisZapi || (form.zapi ? 1 : 0));
    const canaisInsta = form.canaisInsta || 0;
    const canaisMessenger = form.canaisMessenger || 0;

    // Excedentes por tipo (mesma regra para custo Helena e faturamento)
    const excWhats = Math.max(0, canaisWhats - (selectedPlano.canaisWhatsInclusos ?? 0));
    const excInsta = Math.max(0, canaisInsta - (selectedPlano.canaisInstaInclusos ?? 0));
    const excMessenger = Math.max(0, canaisMessenger - (selectedPlano.canaisMessengerInclusos ?? 0));
    const totalExtraCanais = excWhats + excInsta + excMessenger;

    // Custo Helena por tipo (sem progressão por agora — preço por canal de cada tipo)
    const extraCanais =
      excWhats * precoCanalWhatsExc +
      excInsta * precoCanalInstaExc +
      excMessenger * precoCanalMessengerExc;

    const usersExcQtd = Math.max(0, form.usuariosAtivos - (selectedPlano.usuariosInclusos ?? 3));
    const extraUsers = calcularCustoExtraUsuariosHelena(usersExcQtd, precoUsuariosExc);

    const contatosExcQtd = Math.max(0, form.contatosAtivos - (selectedPlano.contatosInclusos ?? 500));
    const extraContatos = calcularCustoExtraContatosHelena(contatosExcQtd, precoContatosExc);

    // Z-API (cobrado por canal configurado como Z-API excedente aos inclusos no plano)
    const zapiInclusos = typeof selectedPlano.incluiZapi === "number" ? selectedPlano.incluiZapi : (selectedPlano.incluiZapi ? 1 : 0);
    const canaisZapiQtd = form.canaisZapi || 0;
    const qtdZapiCliente = canaisZapiQtd > 0 ? Math.max(0, canaisZapiQtd - zapiInclusos) : 0;
    const faturamentoZapi = qtdZapiCliente * valorZapi;
    const zapi = canaisZapiQtd * precoZapi;

    const ia = (form.agentesIA && !selectedPlano.incluiIA) ? precoIA : 0;
    const faturamentoIA = (form.agentesIA && !selectedPlano.incluiIA) ? valorIA : 0;

    const asaas = (form.asaas && !selectedPlano.incluiAsaas) ? precoAsaas : 0;
    const faturamentoAsaas = (form.asaas && !selectedPlano.incluiAsaas) ? valorAsaas : 0;

    const transcricao = (form.transcricaoIA && !selectedPlano.incluiTranscricao) ? (form.usuariosAtivos * precoTranscricaoUser) : 0;
    const faturamentoTranscricao = (form.transcricaoIA && !selectedPlano.incluiTranscricao) ? (form.usuariosAtivos * valorTranscricaoUser) : 0;

    // Faturamento por canal extra usa o mesmo "excedente por tipo" e o preço de cliente por tipo
    const faturamentoCanaisExc =
      excWhats * valorCanalWhatsExc +
      excInsta * valorCanalInstaExc +
      excMessenger * valorCanalMessengerExc;

    const faturamentoUsersExc = usersExcQtd * valorUsuariosExc;
    const faturamentoContatosExc = contatosExcQtd * valorContatosExc;

    const custoTotal = baseLicenceCost + extraCanais + extraUsers + extraContatos + zapi + ia + asaas + transcricao;
    const receitaTotal = (selectedPlano.valorMensal ?? 0) + 
                          faturamentoCanaisExc + 
                          faturamentoUsersExc + 
                          faturamentoContatosExc + 
                          faturamentoZapi + 
                          faturamentoIA + 
                          faturamentoAsaas + 
                          faturamentoTranscricao + 
                          (form.valorAcompanhamento || 0);
    const lucroTotal = receitaTotal - custoTotal;

    return {
      base: baseLicenceCost,
      extraCanais,
      extraCanaisQtd: totalExtraCanais,
      extraUsers,
      extraContatos,
      zapi,
      ia,
      asaas,
      transcricao,
      custoTotal,
      receitaTotal,
      lucroTotal,
      faturamentoBase: selectedPlano.valorMensal ?? 0,
      faturamentoCanaisExc,
      faturamentoUsersExc,
      faturamentoContatosExc,
      faturamentoZapi,
      faturamentoIA,
      faturamentoAsaas,
      faturamentoTranscricao,
    };
  }, [selectedPlano, form]);

  const handlePlanoChange = (planoId: string) => {
    const chosen = planos.find(p => p.id === planoId);
    setForm(prev => {
      const partnerId = (chosen && chosen.parceiroIds && chosen.parceiroIds.length > 0)
        ? chosen.parceiroIds[0]
        : "";
      const zapiInclusos = chosen ? (typeof chosen.incluiZapi === "number" ? chosen.incluiZapi : (chosen.incluiZapi ? 1 : 0)) : 0;
      return {
        ...prev,
        planoId,
        parceiroId: partnerId,
        // Auto fill recommended limits
        canais: chosen?.canaisInclusos ?? 1,
        usuariosAtivos: chosen?.usuariosInclusos ?? 3,
        contatosAtivos: chosen?.contatosInclusos ?? 500,
        agentesIA: chosen?.incluiIA ?? false,
        asaas: chosen?.incluiAsaas ?? false,
        zapi: zapiInclusos > 0,
        canaisZapi: zapiInclusos > 0 ? zapiInclusos : prev.canaisZapi,
        transcricaoIA: chosen?.incluiTranscricao ?? false,
      };
    });
  };

  const handleParceiroChange = (parceiroId: string) => {
    setForm(prev => {
      let targetPlanoId = prev.planoId;
      const matchedPlano = planos.find(p => p.parceiroIds && p.parceiroIds.includes(parceiroId));
      if (matchedPlano) {
        targetPlanoId = matchedPlano.id;
      }
      return { ...prev, parceiroId: parceiroId === "_" ? "" : parceiroId, planoId: targetPlanoId };
    });
  };

  const openAcaoModal = (c: Cliente, tipo: TipoMovimento) => {
    setAcaoClienteId(c.id);
    const isDelta = tipo === "upgrade" || tipo === "downgrade";
    setMovForm({
      data: new Date().toISOString().slice(0, 10),
      tipo,
      planoId: isDelta ? "" : (c.planoId || ""),
      // Upgrade/Downgrade: campos começam vazios (entram apenas as diferenças).
      // Setup: pré-preenche com a configuração atual do cliente.
      canaisWhats: isDelta ? "" : String(c.canaisWhats ?? 0),
      canaisInsta: isDelta ? "" : String(c.canaisInsta ?? 0),
      canaisMessenger: isDelta ? "" : String(c.canaisMessenger ?? 0),
      canaisZapi: isDelta ? "" : String(c.canaisZapi || 0),
      usuariosAtivos: isDelta ? "" : String(c.usuariosAtivos || 3),
      contatosAtivos: isDelta ? "" : String(c.contatosAtivos || 500),
      agentesIA: c.agentesIA || false,
      asaas: c.asaas || false,
      zapi: c.zapi || false,
      transcricaoIA: c.transcricaoIA || false,
      observacao: "",
      valorSetupPago: String(c.valorSetupPago || 0),
      valorAcompanhamento: String(c.valorAcompanhamento || 0),
    });
  };

  const handleSaveMovimento = () => {
    if (!acaoClienteId) return;
    const parseNum = (v: string) => (v.trim() === "" ? undefined : Number(v));
    addMovimento({
      clienteId: acaoClienteId,
      data: movForm.data,
      tipo: movForm.tipo,
      planoId: movForm.planoId || undefined,
      canaisWhats: parseNum(movForm.canaisWhats),
      canaisInsta: parseNum(movForm.canaisInsta),
      canaisMessenger: parseNum(movForm.canaisMessenger),
      canaisZapi: parseNum(movForm.canaisZapi),
      usuariosAtivos: parseNum(movForm.usuariosAtivos),
      contatosAtivos: parseNum(movForm.contatosAtivos),
      agentesIA: movForm.agentesIA,
      asaas: movForm.asaas,
      zapi: movForm.zapi,
      transcricaoIA: movForm.transcricaoIA,
      observacao: movForm.observacao || undefined,
    });
    setAcaoClienteId(null);
  };

  const ordenados = [...movimentos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">Situação atual de cada cliente e histórico</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" /> Novo cliente
        </Button>
      </div>

      {open && (
        <Card className="border-border/60 bg-muted/10 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle>Novo Cliente</CardTitle>
            <CardDescription>Cadastre as informações da conta e visualize o resumo financeiro simulado</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Formulário Principal */}
              <div className="lg:col-span-2 p-6 space-y-6 border-r border-border/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block font-medium">Nome do Cliente</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Acn Corp Ltda" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Plano Contratado</Label>
                    <Select value={form.planoId} onValueChange={handlePlanoChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Parceiro / Agência</Label>
                    <Select value={form.parceiroId || "_"} onValueChange={handleParceiroChange}>
                      <SelectTrigger><SelectValue placeholder="Sem parceiro" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">— Nenhum —</SelectItem>
                        {parceiros.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Data de Início</Label>
                    <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Próximo Vencimento (Dia)</Label>
                    <Input type="number" min={1} max={31} placeholder="Ex: 5, 10, 15..." value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} />
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Configuração de Recursos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais WhatsApp</Label>
                      <Input type="number" min={0} value={form.canaisWhats === 0 ? "" : form.canaisWhats} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisWhats: val,
                          canais: val + prev.canaisInsta + prev.canaisMessenger,
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais Instagram</Label>
                      <Input type="number" min={0} value={form.canaisInsta === 0 ? "" : form.canaisInsta} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisInsta: val,
                          canais: prev.canaisWhats + val + prev.canaisMessenger
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais Messenger FB</Label>
                      <Input type="number" min={0} value={form.canaisMessenger === 0 ? "" : form.canaisMessenger} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisMessenger: val,
                          canais: prev.canaisWhats + prev.canaisInsta + val
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Usuários do Painel</Label>
                      <Input type="number" min={1} value={form.usuariosAtivos === 0 ? "" : form.usuariosAtivos} onChange={(e) => setForm({ ...form, usuariosAtivos: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase font-medium">Valores Comerciais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Valor da Taxa de Setup (Cobrado uma vez)</Label>
                      <Input type="number" min={0} value={form.valorSetupPago === 0 ? "" : form.valorSetupPago} onChange={(e) => setForm({ ...form, valorSetupPago: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} placeholder="Ex: 500" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Acompanhamento Mensal Recorrente</Label>
                      <Input type="number" min={0} value={form.valorAcompanhamento === 0 ? "" : form.valorAcompanhamento} onChange={(e) => setForm({ ...form, valorAcompanhamento: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} placeholder="Ex: 150" />
                    </div>
                  </div>
                </div>

                {/* Switches de Opcionais na mesma linha */}
                <div className="border-t border-border/40 pt-4">
                  <Label className="mb-3 block text-xs font-semibold text-muted-foreground uppercase">Módulos Opcionais Ativados</Label>
                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-center space-x-2.5">
                      <Switch id="ia" checked={form.agentesIA} onCheckedChange={(v) => setForm({ ...form, agentesIA: v })} />
                      <Label htmlFor="ia" className="text-sm cursor-pointer font-medium">Agentes IA</Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Switch id="asaas" checked={form.asaas} onCheckedChange={(v) => setForm({ ...form, asaas: v })} />
                      <Label htmlFor="asaas" className="text-sm cursor-pointer font-medium">ASAAS</Label>
                    </div>
                    <div className="flex items-center space-x-2.5 border border-border/40 rounded-lg px-3 py-1.5 bg-muted/5">
                      <Zap className="h-4 w-4 text-accent" />
                      <Label htmlFor="zapi-qtd" className="text-sm cursor-pointer font-medium">Canais Z-API:</Label>
                      <Input
                        id="zapi-qtd"
                        type="number"
                        className="w-16 h-8 text-center"
                        min={0}
                        value={form.canaisZapi === 0 ? "" : form.canaisZapi}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                          setForm(prev => ({
                            ...prev,
                            canaisZapi: val,
                            zapi: val > 0
                          }));
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Switch id="trans" checked={form.transcricaoIA} onCheckedChange={(v) => setForm({ ...form, transcricaoIA: v })} />
                      <Label htmlFor="trans" className="text-sm cursor-pointer font-medium">Transcrição IA</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Painel do Resumo de Custos e Lucro em Tempo Real */}
              <div className="bg-muted/30 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <DollarSign className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-base tracking-tight">Simulação em Tempo Real</h3>
                  </div>

                  {/* Volume Contemplado vs Preço */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Plano base ({selectedPlano?.nome}):</span>
                      <span className="font-medium text-foreground">{formatBRL(realTimePricing.faturamentoBase)}</span>
                    </div>

                    {form.valorAcompanhamento > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Acompanhamento comercial:</span>
                        <span className="font-medium text-foreground">+{formatBRL(form.valorAcompanhamento)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoCanaisExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Canais extras (+{realTimePricing.extraCanaisQtd}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoCanaisExc)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoUsersExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Usuários extras (+{Math.max(0, form.usuariosAtivos - (selectedPlano?.usuariosInclusos ?? 3))}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoUsersExc)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoContatosExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Contatos extras:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoContatosExc)}</span>
                      </div>
                    )}

                    {form.canaisZapi > 0 && realTimePricing.faturamentoZapi > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Z-API ({form.canaisZapi} {form.canaisZapi === 1 ? 'canal' : 'canais'}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoZapi)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoIA > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Agentes IA Ativo:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoIA)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoAsaas > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>ASAAS Ativo:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoAsaas)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoTranscricao > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Transcrição IA Ativa:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoTranscricao)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center font-semibold text-sm pt-2 border-t border-border/40 text-accent mt-1">
                      <span>Faturamento Mensal (MRR):</span>
                      <span>{formatBRL(realTimePricing.receitaTotal)}</span>
                    </div>

                    {form.valorSetupPago > 0 && (
                      <div className="flex justify-between items-center text-xs text-primary font-medium py-1">
                        <span>Taxa de Setup única:</span>
                        <span>{formatBRL(form.valorSetupPago)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border mt-2 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Custo da Infraestrutura:</p>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Licença base:</span>
                        <span>{formatBRL(realTimePricing.base)}</span>
                      </div>

                      {realTimePricing.extraCanais > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Canais extra (+{realTimePricing.extraCanaisQtd}):</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.extraCanais)}</span>
                        </div>
                      )}

                      {realTimePricing.extraUsers > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Users extra (+{Math.max(0, form.usuariosAtivos - (selectedPlano?.usuariosInclusos ?? 3))}):</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.extraUsers)}</span>
                        </div>
                      )}

                      {form.canaisZapi > 0 && realTimePricing.zapi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Modulação Z-API ({form.canaisZapi} {form.canaisZapi === 1 ? 'canal' : 'canais'}):</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.zapi)}</span>
                        </div>
                      )}

                      {realTimePricing.ia > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Módulo Inteligência Artificial:</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.ia)}</span>
                        </div>
                      )}

                      {realTimePricing.asaas > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gateway de Pagamento ASAAS:</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.asaas)}</span>
                        </div>
                      )}

                      {realTimePricing.transcricao > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transcrição IA ({form.usuariosAtivos} users):</span>
                          <span className="text-yellow-400">+{formatBRL(realTimePricing.transcricao)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border mt-6">
                  <div className="rounded-lg bg-background/50 p-3 space-y-2 border border-border/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Total Custo mensal:</span>
                      <span className="font-semibold text-yellow-400">{formatBRL(realTimePricing.custoTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1 border-t border-border/20">
                      <span className="font-semibold text-muted-foreground">Resultado Líquido:</span>
                      <span className={`font-bold ${realTimePricing.lucroTotal >= 0 ? "text-accent" : "text-destructive"}`}>
                        {formatBRL(realTimePricing.lucroTotal)}/mês
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11"
                    disabled={!form.nome || !form.planoId}
                    onClick={() => {
                      addCliente({
                        nome: form.nome,
                        planoId: form.planoId,
                        dataInicio: form.dataInicio,
                        dataChurn: null,
                        dataVencimento: form.dataVencimento || null,
                        parceiroId: form.parceiroId || null,
                        canais: form.canaisWhats + form.canaisInsta + form.canaisMessenger,
                        canaisZapi: form.canaisZapi,
                        canaisWhats: form.canaisWhats,
                        canaisInsta: form.canaisInsta,
                        canaisMessenger: form.canaisMessenger,
                        usuariosAtivos: form.usuariosAtivos,
                        contatosAtivos: form.contatosAtivos,
                        agentesIA: form.agentesIA,
                        asaas: form.asaas,
                        zapi: form.zapi,
                        transcricaoIA: form.transcricaoIA,
                        valorSetupPago: form.valorSetupPago,
                        valorAcompanhamento: form.valorAcompanhamento,
                        extras: {},
                        apps: 1,
                        mau: form.contatosAtivos
                      });
                      setForm({
                        nome: "",
                        planoId: planos[0]?.id ?? "",
                        parceiroId: "",
                        dataInicio: new Date().toISOString().slice(0, 10),
                        dataVencimento: "",
                        canais: 1,
                        canaisWhats: 1,
                        canaisInsta: 0,
                        canaisMessenger: 0,
                        canaisZapi: 0,
                        usuariosAtivos: 3,
                        contatosAtivos: 500,
                        agentesIA: false,
                        asaas: false,
                        zapi: false,
                        transcricaoIA: false,
                        valorSetupPago: 0,
                        valorAcompanhamento: 0,
                      });
                      setOpen(false);
                    }}
                  >
                    Salvar Cliente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carteira Ativa */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Carteira Ativa</CardTitle>
          <CardDescription>Visualização em tempo real das mensalidades, custos calculados e lucratividade por cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Data Setup</TableHead>
                <TableHead className="text-right">Tempo de vida</TableHead>
                <TableHead>Data Churn</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Margem de lucro</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => {
                const plano = planos.find((p) => p.id === c.planoId);
                const parceiro = parceiros.find((p) => p.id === c.parceiroId);
                const receita = receitaMensalCliente(c, planos, custos);
                const custoCalculado = custoMensalCliente(c, planos, custos);
                const lucro = receita - custoCalculado;
                
                const start = new Date(c.dataInicio);
                const end = c.dataChurn ? new Date(c.dataChurn) : new Date();
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diasAtivos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const tempoVidaLabel = `${diasAtivos} ${diasAtivos === 1 ? "dia" : "dias"}`;
                const margem = receita > 0 ? (lucro / receita) * 100 : 0;
                
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span
                          onClick={() => setSelectedClienteId(c.id)}
                          className="cursor-pointer text-primary hover:underline"
                        >
                          {c.nome}
                        </span>
                        {c.dataVencimento && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Vencimento: Dia {formatDiaVencimento(c.dataVencimento)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{plano?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{parceiro?.nome ?? "—"}</TableCell>
                    <TableCell>{c.dataInicio.split("-").reverse().join("/")}</TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">{tempoVidaLabel}</TableCell>
                    <TableCell className={c.dataChurn ? "text-destructive font-medium" : "text-muted-foreground"}>{c.dataChurn ? c.dataChurn.split("-").reverse().join("/") : "Ativo"}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {formatBRL(receita)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={lucro >= 0 ? "bg-accent/20 text-accent font-semibold" : "bg-destructive/20 text-destructive font-semibold"}>
                          {lucro >= 0 ? "+" : ""}{formatBRL(lucro)}
                        </Badge>
                        <span className={`text-[10px] font-medium ${margem >= 0 ? "text-accent" : "text-destructive"}`}>{margem.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAcaoModal(c, "upgrade")}>
                            <Settings2 className="mr-2 h-4 w-4" /> Mudar Plano / Recursos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAcaoModal(c, "churn")} className="text-destructive focus:text-destructive">
                            <XCircle className="mr-2 h-4 w-4" /> Registrar Cancelamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removeCliente(c.id)} className="text-muted-foreground focus:text-muted-foreground">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clientes.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhum cliente cadastrado ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Modal de Detalhes do Cliente com Histórico e Linha de Tempo */}
      <Dialog open={!!selectedClienteId} onOpenChange={(isOpen) => !isOpen && setSelectedClienteId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {(() => {
            const cliente = clientes.find((c) => c.id === selectedClienteId);
            if (!cliente) return null;
            const plano = planos.find((p) => p.id === cliente.planoId);
            const parceiro = parceiros.find((p) => p.id === cliente.parceiroId);
            
            // Calculate active days
            const start = new Date(cliente.dataInicio);
            const end = cliente.dataChurn ? new Date(cliente.dataChurn) : new Date();
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Generate timeline events
            const timelineEvents: { data: string; titulo: string; desc: string; icon: any; color: string }[] = [];
            
            // 1. Setup Event
            timelineEvents.push({
              data: cliente.dataInicio,
              titulo: "Setup Inicial",
              desc: `Conta criada no plano "${plano?.nome ?? 'Rabbit Essencial'}". Canais: ${cliente.canais || 1}, Usuários: ${cliente.usuariosAtivos || 3}, Contatos: ${cliente.contatosAtivos || 500}. Setup pago: ${formatBRL(cliente.valorSetupPago || 0)}.`,
              icon: Plus,
              color: "text-primary border-primary",
            });
            
            // 2. Add custom movement events from store
            const clientMovs = movimentos
              .filter((m) => m.clienteId === cliente.id)
              .sort((a, b) => a.data.localeCompare(b.data));
              
            clientMovs.forEach((m) => {
              const matchedPlano = planos.find((p) => p.id === m.planoId);
              let descParts: string[] = [];
              const isDelta = m.tipo === "upgrade" || m.tipo === "downgrade";
              const fmtDelta = (v: number) => (v > 0 ? `+${v}` : `${v}`);
              const fmtNum = (label: string, v: number | undefined) => {
                if (v === undefined || v === null) return;
                if (isDelta) {
                  if (v === 0) return;
                  descParts.push(`${label} ${fmtDelta(v)}`);
                } else {
                  descParts.push(`${label}: ${v}`);
                }
              };
              if (m.planoId) descParts.push(`Plano alterado para "${matchedPlano?.nome ?? m.planoId}"`);
              fmtNum("Canais WhatsApp", m.canaisWhats);
              fmtNum("Canais Instagram", m.canaisInsta);
              fmtNum("Canais Messenger", m.canaisMessenger);
              fmtNum("Canais Z-API", m.canaisZapi);
              fmtNum("Canais", m.canais);
              fmtNum("Usuários", m.usuariosAtivos);
              fmtNum("Contatos/MAU", m.contatosAtivos);
              if (m.observacao) descParts.push(`Obs: ${m.observacao}`);
              
              const mTipoLabel = tiposMovimento.find(t => t.value === m.tipo)?.label || m.tipo;
              
              timelineEvents.push({
                data: m.data,
                titulo: mTipoLabel.charAt(0).toUpperCase() + mTipoLabel.slice(1),
                desc: descParts.join(" | ") || "Recursos da conta atualizados.",
                icon: m.tipo === "upgrade" ? TrendingUp : m.tipo === "downgrade" ? TrendingDown : Settings2,
                color: m.tipo === "upgrade" ? "text-accent border-accent" : m.tipo === "downgrade" ? "text-yellow-500 border-yellow-500" : "text-muted-foreground border-muted-foreground",
              });
            });
            
            // 3. Churn Event
            if (cliente.dataChurn) {
              timelineEvents.push({
                data: cliente.dataChurn,
                titulo: "Churn (Cancelamento)",
                desc: `A conta foi desativada e o serviço cancelado.`,
                icon: XCircle,
                color: "text-destructive border-destructive",
              });
            }
            
            // Mais recentes primeiro
            timelineEvents.sort((a, b) => b.data.localeCompare(a.data));

            return (
              <>
                <DialogHeader className="border-b border-border pb-4">
                  <DialogTitle className="text-2xl flex items-center justify-between">
                    <span>{cliente.nome}</span>
                    <Badge variant={cliente.dataChurn ? "destructive" : "outline"} className={cliente.dataChurn ? "bg-destructive/20 text-destructive font-semibold border-none" : "bg-accent/20 text-accent font-semibold border-none"}>
                      {cliente.dataChurn ? "Inativo / Churn" : "Ativo"}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                  {/* Resumo do Cliente */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo do Cliente</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome do Cliente</p>
                        <p className="text-sm font-medium">{cliente.nome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Plano</p>
                        <p className="text-sm font-medium">{plano?.nome ?? "Rabbit Essencial"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parceiro / Agência</p>
                        <p className="text-sm font-medium">{parceiro?.nome ?? "Sem parceiro"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">MRR (Faturamento)</p>
                        <p className="text-sm font-bold text-primary">{formatBRL(receitaMensalCliente(cliente, planos, custos))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Setup</p>
                        <p className="text-sm font-medium">{cliente.dataInicio.split("-").reverse().join("/")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Churn</p>
                        <p className="text-sm font-medium text-destructive">{cliente.dataChurn ? cliente.dataChurn.split("-").reverse().join("/") : "—"}</p>
                      </div>
                      <div className="col-span-2 md:col-span-3 border-t border-border/40 pt-2.5 mt-1 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Tempo de Permanência (Dias Ativos)</span>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold">{diffDays} dias ativos</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Pacote Atual */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pacote Atual de Recursos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-border/40 p-4 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Canais WhatsApp (Z-API)</p>
                        <p className="text-sm font-semibold text-foreground">{(cliente.canaisWhats !== undefined ? cliente.canaisWhats : (cliente.canaisZapi || 0))} canais</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Outros Canais</p>
                        <p className="text-sm font-semibold text-foreground">{cliente.canaisInsta || 0} Insta | {cliente.canaisMessenger || 0} Msg</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                        <p className="text-sm font-semibold text-foreground">{cliente.usuariosAtivos || 0} SDR / Agentes</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Contatos / MAU</p>
                        <p className="text-sm font-semibold text-foreground">{cliente.contatosAtivos || 0} inclusos</p>
                      </div>
                      <div className="space-y-0.5 col-span-2 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Módulos Extras Ativos</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {cliente.agentesIA && <Badge className="text-[10px] bg-accent/20 text-accent font-semibold border-none">Agentes IA</Badge>}
                          {cliente.asaas && <Badge className="text-[10px] bg-accent/20 text-accent font-semibold border-none">ASAAS</Badge>}
                          {cliente.zapi && <Badge className="text-[10px] bg-accent/20 text-accent font-semibold border-none">Z-API WhatsApp</Badge>}
                          {cliente.transcricaoIA && <Badge className="text-[10px] bg-accent/20 text-accent font-semibold border-none">Transcrição de Áudio com IA</Badge>}
                          {!cliente.agentesIA && !cliente.asaas && !cliente.zapi && !cliente.transcricaoIA && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Histórico / Linha do Tempo */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linha do Tempo de Movimentações</h3>
                    <div className="relative border-l-2 border-border ml-3.5 pl-6 space-y-6">
                      {timelineEvents.map((evt, idx) => {
                        const EvtIcon = evt.icon;
                        return (
                          <div key={idx} className="relative">
                            <span className={`absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${evt.color}`}>
                              <EvtIcon className="h-3 w-3" />
                            </span>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">{evt.data.split("-").reverse().join("/")}</span>
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{evt.titulo}</span>
                              </div>
                              <p className="text-sm text-muted-foreground pr-4 leading-relaxed">{evt.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setSelectedClienteId(null)}>Fechar Detalhes</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* Modal para Registrar Upgrade/Ajuste/Recursos */}
      <Dialog open={!!acaoClienteId} onOpenChange={(isOpen) => !isOpen && setAcaoClienteId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Movimento</DialogTitle>
          </DialogHeader>
          {(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") && (
            <p className="text-xs text-muted-foreground -mt-2">
              Informe apenas o que <strong>mudou</strong>. Use números positivos para adicionar
              e negativos para reduzir (ex.: <code>-1</code> em Canais WhatsApp). Campos em branco permanecem inalterados.
              Os novos valores passam a valer nos próximos fechamentos.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div>
              <Label className="mb-1 block">Tipo de Ação</Label>
              <Select value={movForm.tipo} onValueChange={(v: TipoMovimento) => setMovForm({ ...movForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposMovimento.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Data da Ação</Label>
              <Input type="date" value={movForm.data} onChange={(e) => setMovForm({ ...movForm, data: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Novo Plano</Label>
              <Select value={movForm.planoId} onValueChange={(v) => setMovForm({ ...movForm, planoId: v })}>
                <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
                <SelectContent>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Atualização de Recursos */}
            <div>
              <Label className="mb-1 block">Canais WhatsApp</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +1 ou -1" : ""} value={movForm.canaisWhats} onChange={(e) => setMovForm({ ...movForm, canaisWhats: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Instagram</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +1 ou -1" : ""} value={movForm.canaisInsta} onChange={(e) => setMovForm({ ...movForm, canaisInsta: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Messenger</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +1 ou -1" : ""} value={movForm.canaisMessenger} onChange={(e) => setMovForm({ ...movForm, canaisMessenger: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Z-API</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +1 ou -1" : ""} value={movForm.canaisZapi} onChange={(e) => setMovForm({ ...movForm, canaisZapi: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Usuários</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +1 ou -1" : ""} value={movForm.usuariosAtivos} onChange={(e) => setMovForm({ ...movForm, usuariosAtivos: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block font-medium">Contatos / MAU</Label>
              <Input type="number" placeholder={(movForm.tipo === "upgrade" || movForm.tipo === "downgrade") ? "Ex.: +500 ou -200" : ""} value={movForm.contatosAtivos} onChange={(e) => setMovForm({ ...movForm, contatosAtivos: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label className="mb-1 block">Observação</Label>
              <Input value={movForm.observacao} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} placeholder="Detalhe opcional do movimento" />
            </div>
            
            <div className="grid grid-cols-2 md:col-span-3 gap-4 border-t border-border pt-4 mt-2">
              <div className="flex items-center space-x-2 h-10">
                <Switch checked={movForm.agentesIA} onCheckedChange={(v) => setMovForm({ ...movForm, agentesIA: v })} />
                <Label>Agentes IA</Label>
              </div>
              <div className="flex items-center space-x-2 h-10">
                <Switch checked={movForm.asaas} onCheckedChange={(v) => setMovForm({ ...movForm, asaas: v })} />
                <Label>ASAAS</Label>
              </div>
              <div className="flex items-center space-x-2 h-10">
                <Switch checked={movForm.zapi} onCheckedChange={(v) => setMovForm({ ...movForm, zapi: v })} />
                <Label>Z-API</Label>
              </div>
              <div className="flex items-center space-x-2 h-10">
                <Switch checked={movForm.transcricaoIA} onCheckedChange={(v) => setMovForm({ ...movForm, transcricaoIA: v })} />
                <Label>Transcrição IA</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcaoClienteId(null)}>Cancelar</Button>
            <Button onClick={handleSaveMovimento}>Registrar Ação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}