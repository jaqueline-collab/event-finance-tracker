import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, formatBRL } from "@/lib/store";
import type { Plano } from "@/lib/types";
import { Plus, Trash2, Pencil, Bot, CreditCard, Zap, AudioLines, Briefcase, Layers } from "lucide-react";

export const Route = createFileRoute("/planos")({
  head: () => ({ meta: [{ title: "Planos · Elora" }] }),
  component: PlanosPage,
});

type PlanoForm = {
  nome: string;
  categoria: "elora" | "consultoria";
  cobranca: "recorrente" | "unica";
  duracaoValor: string;
  duracaoUnidade: "" | "dias" | "meses" | "anos";
  valorMensal: string;
  valorSetup: string;
  diaVencimento: string;
  canaisWhatsInclusos: string;
  canaisInstaInclusos: string;
  canaisMessengerInclusos: string;
  usuariosInclusos: string;
  contatosInclusos: string;
  incluiIA: boolean;
  incluiAsaas: boolean;
  incluiZapi: number;
  incluiTranscricao: boolean;
  licencaBase: string;
  precoCanalWhatsExc: string;
  precoCanalInstaExc: string;
  precoCanalMessengerExc: string;
  precoUsuariosExc: string;
  precoContatosExc: string;
  precoIA: string;
  precoAsaas: string;
  precoZapi: string;
  precoTranscricaoUser: string;
  valorCanalWhatsExc: string;
  valorCanalInstaExc: string;
  valorCanalMessengerExc: string;
  valorUsuariosExc: string;
  valorContatosExc: string;
  valorIA: string;
  valorAsaas: string;
  valorZapi: string;
  valorTranscricaoUser: string;
  parceiroIds: string[];
};

const defaultForm = (): PlanoForm => ({
  nome: "",
  categoria: "elora",
  cobranca: "recorrente",
  duracaoValor: "",
  duracaoUnidade: "",
  valorMensal: "",
  valorSetup: "",
  diaVencimento: "",
  canaisWhatsInclusos: "1",
  canaisInstaInclusos: "0",
  canaisMessengerInclusos: "0",
  usuariosInclusos: "3",
  contatosInclusos: "500",
  incluiIA: false,
  incluiAsaas: false,
  incluiZapi: 0,
  incluiTranscricao: false,
  licencaBase: "149.90",
  precoCanalWhatsExc: "29.90",
  precoCanalInstaExc: "29.90",
  precoCanalMessengerExc: "29.90",
  precoUsuariosExc: "19.90",
  precoContatosExc: "0.045",
  precoIA: "50.00",
  precoAsaas: "49.50",
  precoZapi: "69.00",
  precoTranscricaoUser: "3.99",
  valorCanalWhatsExc: "59.90",
  valorCanalInstaExc: "59.90",
  valorCanalMessengerExc: "59.90",
  valorUsuariosExc: "39.90",
  valorContatosExc: "0.10",
  valorIA: "99.00",
  valorAsaas: "89.00",
  valorZapi: "149.00",
  valorTranscricaoUser: "7.99",
  parceiroIds: [],
});

function PlanosPage() {
  const { planos, parceiros, addPlano, updatePlano, removePlano } = useStore();
  const [form, setForm] = useState<PlanoForm>(defaultForm());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const toggleParceiro = (parceiroId: string) => {
    setForm((prev) => ({
      ...prev,
      parceiroIds: prev.parceiroIds.includes(parceiroId)
        ? prev.parceiroIds.filter((id) => id !== parceiroId)
        : [...prev.parceiroIds, parceiroId],
    }));
  };

  const handleSave = () => {
    const whatsInc = Number(form.canaisWhatsInclusos) || 0;
    const instaInc = Number(form.canaisInstaInclusos) || 0;
    const msgInc = Number(form.canaisMessengerInclusos) || 0;
    const planoData: Omit<Plano, "id"> = {
      nome: form.nome,
      categoria: form.categoria,
      cobranca: form.cobranca,
      duracaoValor: form.duracaoValor ? Number(form.duracaoValor) : null,
      duracaoUnidade: form.duracaoUnidade || null,
      valorMensal: Number(form.valorMensal) || 0,
      valorSetup: Number(form.valorSetup) || 0,
      diaVencimento: form.diaVencimento ? Math.max(1, Math.min(31, Number(form.diaVencimento))) : null,
      canaisInclusos: whatsInc + instaInc + msgInc,
      canaisWhatsInclusos: whatsInc,
      canaisInstaInclusos: instaInc,
      canaisMessengerInclusos: msgInc,
      usuariosInclusos: Number(form.usuariosInclusos) || 0,
      contatosInclusos: Number(form.contatosInclusos) || 0,
      incluiIA: form.incluiIA,
      incluiAsaas: form.incluiAsaas,
      incluiZapi: form.incluiZapi,
      incluiTranscricao: form.incluiTranscricao,
      licencaBase: Number(form.licencaBase) || 149.90,
      precoCanaisExc: Number(form.precoCanalWhatsExc) || 29.90,
      precoCanalWhatsExc: Number(form.precoCanalWhatsExc) || 29.90,
      precoCanalInstaExc: Number(form.precoCanalInstaExc) || 29.90,
      precoCanalMessengerExc: Number(form.precoCanalMessengerExc) || 29.90,
      precoUsuariosExc: Number(form.precoUsuariosExc) || 19.90,
      precoContatosExc: Number(form.precoContatosExc) || 0.045,
      precoIA: Number(form.precoIA) || 50.00,
      precoAsaas: Number(form.precoAsaas) || 49.50,
      precoZapi: Number(form.precoZapi) || 69.00,
      precoTranscricaoUser: Number(form.precoTranscricaoUser) || 3.99,
      valorCanaisExc: Number(form.valorCanalWhatsExc) || 59.90,
      valorCanalWhatsExc: Number(form.valorCanalWhatsExc) || 59.90,
      valorCanalInstaExc: Number(form.valorCanalInstaExc) || 59.90,
      valorCanalMessengerExc: Number(form.valorCanalMessengerExc) || 59.90,
      valorUsuariosExc: Number(form.valorUsuariosExc) || 39.90,
      valorContatosExc: Number(form.valorContatosExc) || 0.10,
      valorIA: Number(form.valorIA) || 99.00,
      valorAsaas: Number(form.valorAsaas) || 89.00,
      valorZapi: Number(form.valorZapi) || 149.00,
      valorTranscricaoUser: Number(form.valorTranscricaoUser) || 7.99,
      parceiroIds: form.parceiroIds,
    };

    if (editId) {
      updatePlano(editId, planoData);
      setEditId(null);
    } else {
      addPlano(planoData);
    }
    setForm(defaultForm());
    setOpen(false);
  };

  const startEdit = (p: Plano) => {
    setEditId(p.id);
    setForm({
      nome: p.nome,
      categoria: p.categoria ?? "elora",
      cobranca: p.cobranca ?? "recorrente",
      duracaoValor: p.duracaoValor != null ? String(p.duracaoValor) : "",
      duracaoUnidade: p.duracaoUnidade ?? "",
      valorMensal: String(p.valorMensal || ""),
      valorSetup: String(p.valorSetup || ""),
      diaVencimento: p.diaVencimento ? String(p.diaVencimento) : "",
      canaisWhatsInclusos: String(p.canaisWhatsInclusos ?? p.canaisInclusos ?? 0),
      canaisInstaInclusos: String(p.canaisInstaInclusos ?? 0),
      canaisMessengerInclusos: String(p.canaisMessengerInclusos ?? 0),
      usuariosInclusos: String(p.usuariosInclusos || ""),
      contatosInclusos: String(p.contatosInclusos || ""),
      incluiIA: p.incluiIA,
      incluiAsaas: p.incluiAsaas,
      incluiZapi: typeof p.incluiZapi === "number" ? p.incluiZapi : (p.incluiZapi ? 1 : 0),
      incluiTranscricao: p.incluiTranscricao,
      licencaBase: String(p.licencaBase ?? 149.90),
      precoCanalWhatsExc: String(p.precoCanalWhatsExc ?? p.precoCanaisExc ?? 29.90),
      precoCanalInstaExc: String(p.precoCanalInstaExc ?? p.precoCanaisExc ?? 29.90),
      precoCanalMessengerExc: String(p.precoCanalMessengerExc ?? p.precoCanaisExc ?? 29.90),
      precoUsuariosExc: String(p.precoUsuariosExc ?? 19.90),
      precoContatosExc: String(p.precoContatosExc ?? 0.045),
      precoIA: String(p.precoIA ?? 50.00),
      precoAsaas: String(p.precoAsaas ?? 49.50),
      precoZapi: String(p.precoZapi ?? 69.00),
      precoTranscricaoUser: String(p.precoTranscricaoUser ?? 3.99),
      valorCanalWhatsExc: String(p.valorCanalWhatsExc ?? p.valorCanaisExc ?? 59.90),
      valorCanalInstaExc: String(p.valorCanalInstaExc ?? p.valorCanaisExc ?? 59.90),
      valorCanalMessengerExc: String(p.valorCanalMessengerExc ?? p.valorCanaisExc ?? 59.90),
      valorUsuariosExc: String(p.valorUsuariosExc ?? 39.90),
      valorContatosExc: String(p.valorContatosExc ?? 0.10),
      valorIA: String(p.valorIA ?? 99.00),
      valorAsaas: String(p.valorAsaas ?? 89.00),
      valorZapi: String(p.valorZapi ?? 149.00),
      valorTranscricaoUser: String(p.valorTranscricaoUser ?? 7.99),
      parceiroIds: p.parceiroIds ?? [],
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Planos</h1>
          <p className="text-muted-foreground text-sm">Configure os pacotes comerciais com franquias e custos operacionais</p>
        </div>
        <Button onClick={() => { setOpen((v) => !v); setEditId(null); setForm(defaultForm()); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {open && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>{editId ? "Editar Plano" : "Criar Novo Plano"}</CardTitle>
            <CardDescription>Configure os dados comerciais, franquias e os preços de custo operacional por plano.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Comerciais */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tipo do Plano</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="mb-1 block">Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as "elora" | "consultoria" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elora">Plano Elora (ferramenta)</SelectItem>
                      <SelectItem value="consultoria">Consultoria / Mentoria / Curso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">Tipo de cobrança</Label>
                  <Select value={form.cobranca} onValueChange={(v) => setForm({ ...form, cobranca: v as "recorrente" | "unica" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorrente">Recorrente (mensal)</SelectItem>
                      <SelectItem value="unica">Pagamento único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados Comerciais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <Label className="mb-1 block">Nome do Plano</Label>
                  <Input placeholder={form.categoria === "consultoria" ? "Ex: Mentoria Trimestral, Curso Avançado..." : "Ex: Starter, Growth, Scale..."} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">{form.cobranca === "unica" ? "Valor total (R$)" : "Mensalidade cobrada do cliente (R$)"}</Label>
                  <Input type="number" step="0.01" value={form.valorMensal} onChange={(e) => setForm({ ...form, valorMensal: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">Taxa de Setup / Entrada (R$)</Label>
                  <Input type="number" step="0.01" value={form.valorSetup} onChange={(e) => setForm({ ...form, valorSetup: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">Dia de vencimento padrão</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ex: 5, 10, 15…"
                    value={form.diaVencimento}
                    onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Aplicado a clientes deste plano. Cada cliente pode sobrescrever.</p>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block">Duração (opcional)</Label>
                    <Input type="number" min={1} placeholder="Ex: 6, 12…" value={form.duracaoValor} onChange={(e) => setForm({ ...form, duracaoValor: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Unidade da duração</Label>
                    <Select value={form.duracaoUnidade || "indefinido"} onValueChange={(v) => setForm({ ...form, duracaoUnidade: v === "indefinido" ? "" : (v as "dias" | "meses" | "anos") })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinido">Sem prazo definido</SelectItem>
                        <SelectItem value="dias">Dias</SelectItem>
                        <SelectItem value="meses">Meses</SelectItem>
                        <SelectItem value="anos">Anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Franquias — só Elora */}
            {form.categoria === "elora" && (<>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Franquias Incluídas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="mb-1 block">Canais WhatsApp Inclusos</Label>
                  <Input type="number" min={0} value={form.canaisWhatsInclusos} onChange={(e) => setForm({ ...form, canaisWhatsInclusos: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">Canais Instagram Inclusos</Label>
                  <Input type="number" min={0} value={form.canaisInstaInclusos} onChange={(e) => setForm({ ...form, canaisInstaInclusos: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">Canais Messenger Inclusos</Label>
                  <Input type="number" min={0} value={form.canaisMessengerInclusos} onChange={(e) => setForm({ ...form, canaisMessengerInclusos: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Usuários Incluídos</Label>
                  <Input type="number" value={form.usuariosInclusos} onChange={(e) => setForm({ ...form, usuariosInclusos: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">Contatos Ativos/Mês (MAU)</Label>
                  <Input type="number" value={form.contatosInclusos} onChange={(e) => setForm({ ...form, contatosInclusos: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Módulos opcionais */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos Opcionais Incluídos</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 3 switches normais */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "incluiIA" as const, label: "Agentes IA", icon: Bot },
                    { key: "incluiAsaas" as const, label: "ASAAS", icon: CreditCard },
                    { key: "incluiTranscricao" as const, label: "Transcrição", icon: AudioLines },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${form[key] ? "border-primary bg-primary/10" : "border-border/60"}`} onClick={() => setForm({ ...form, [key]: !form[key] })}>
                      <Switch checked={form[key] as boolean} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
                      <Label className="flex items-center gap-1.5 cursor-pointer flex-1"><Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}</Label>
                    </div>
                  ))}
                </div>

                {/* Z-API como campo de quantidade */}
                <div className={`flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors ${form.incluiZapi > 0 ? "border-primary bg-primary/10" : "border-border/60"}`}>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <Label className="text-xs font-medium">Qtd Z-API Inclusos</Label>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    className="w-16 h-8 text-center"
                    value={form.incluiZapi}
                    onChange={(e) => setForm({ ...form, incluiZapi: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>
            </div>

            {/* Preços de Venda ao Cliente */}
            <div className="border-t border-border/40 pt-4">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Preços de Venda ao Cliente (Cobrados para Excedentes e Opcionais)</h3>
              <p className="text-xs text-muted-foreground mb-3">Defina quanto você quer cobrar do cliente caso ele use recursos extras ou ative módulos opcionais.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="mb-1 block text-xs">Canal WhatsApp extra (R$)</Label>
                  <Input type="number" step="0.01" value={form.valorCanalWhatsExc} onChange={(e) => setForm({ ...form, valorCanalWhatsExc: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Canal Instagram extra (R$)</Label>
                  <Input type="number" step="0.01" value={form.valorCanalInstaExc} onChange={(e) => setForm({ ...form, valorCanalInstaExc: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Canal Messenger extra (R$)</Label>
                  <Input type="number" step="0.01" value={form.valorCanalMessengerExc} onChange={(e) => setForm({ ...form, valorCanalMessengerExc: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Usuário extra (R$/user)</Label>
                  <Input type="number" step="0.01" value={form.valorUsuariosExc} onChange={(e) => setForm({ ...form, valorUsuariosExc: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">MAU excedente (R$/contato)</Label>
                  <Input type="number" step="0.001" value={form.valorContatosExc} onChange={(e) => setForm({ ...form, valorContatosExc: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">IA (R$/conta)</Label>
                  <Input type="number" step="0.01" value={form.valorIA} onChange={(e) => setForm({ ...form, valorIA: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">ASAAS (R$/conta)</Label>
                  <Input type="number" step="0.01" value={form.valorAsaas} onChange={(e) => setForm({ ...form, valorAsaas: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Z-API (R$/conta)</Label>
                  <Input type="number" step="0.01" value={form.valorZapi} onChange={(e) => setForm({ ...form, valorZapi: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Transcrição (R$/user)</Label>
                  <Input type="number" step="0.01" value={form.valorTranscricaoUser} onChange={(e) => setForm({ ...form, valorTranscricaoUser: e.target.value })} />
                </div>
              </div>
            </div>
            </>)}

            {/* Parceiros vinculados */}
            {parceiros.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parceiros que vendem este plano</h3>
                <div className="flex flex-wrap gap-3">
                  {parceiros.map((p) => (
                    <div key={p.id} className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${form.parceiroIds.includes(p.id) ? "border-primary bg-primary/10" : "border-border/60"}`} onClick={() => toggleParceiro(p.id)}>
                      <Checkbox checked={form.parceiroIds.includes(p.id)} onCheckedChange={() => toggleParceiro(p.id)} />
                      <Label className="cursor-pointer text-sm">{p.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); }}>Cancelar</Button>
              <Button disabled={!form.nome} onClick={handleSave}>
                {editId ? "Salvar Alterações" : <><Plus className="mr-2 h-4 w-4" />Criar Plano</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {planos.map((p) => {
          const ps = parceiros.filter((pr) => (p.parceiroIds ?? []).includes(pr.id));
          return (
            <Card key={p.id} className="border-border/60 hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{p.nome}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1 mb-1">
                      <Badge variant={p.categoria === "consultoria" ? "default" : "secondary"} className="text-[10px] gap-1">
                        {p.categoria === "consultoria" ? <><Briefcase className="h-3 w-3" /> Consultoria</> : <><Layers className="h-3 w-3" /> Elora</>}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{p.cobranca === "unica" ? "Pagamento único" : "Recorrente"}</Badge>
                      {p.duracaoValor && p.duracaoUnidade && (
                        <Badge variant="outline" className="text-[10px]">{p.duracaoValor} {p.duracaoUnidade}</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-primary mt-1">{formatBRL(p.valorMensal)}<span className="text-sm font-normal text-muted-foreground">{p.cobranca === "unica" ? " total" : "/mês"}</span></p>
                    {p.valorSetup > 0 && <p className="text-xs text-muted-foreground">Setup: {formatBRL(p.valorSetup)}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removePlano(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>📡 WhatsApp: {p.canaisWhatsInclusos ?? 0} · Instagram: {p.canaisInstaInclusos ?? 0} · Messenger: {p.canaisMessengerInclusos ?? 0}</span>
                  <span>👥 {p.usuariosInclusos} usuário(s) · 💬 {p.contatosInclusos.toLocaleString()} contatos</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.incluiIA && <Badge variant="secondary" className="text-xs gap-1"><Bot className="h-3 w-3" /> IA</Badge>}
                  {p.incluiAsaas && <Badge variant="secondary" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> ASAAS</Badge>}
                  {((typeof p.incluiZapi === "number" ? p.incluiZapi : (p.incluiZapi ? 1 : 0)) > 0) && <Badge variant="secondary" className="text-xs gap-1"><Zap className="h-3 w-3" /> Z-API ({typeof p.incluiZapi === "number" ? p.incluiZapi : 1})</Badge>}
                  {p.incluiTranscricao && <Badge variant="secondary" className="text-xs gap-1"><AudioLines className="h-3 w-3" /> Transcrição</Badge>}
                </div>
                {ps.length > 0 && (
                  <div className="pt-1 border-t border-border/60">
                    <p className="text-xs text-muted-foreground mb-1">Parceiros:</p>
                    <div className="flex flex-wrap gap-1">{ps.map((pr) => <Badge key={pr.id} variant="outline" className="text-xs">{pr.nome}</Badge>)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {planos.length === 0 && (
          <div className="col-span-3 text-center text-muted-foreground py-12 border border-dashed border-border rounded-lg">
            Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
          </div>
        )}
      </div>
    </div>
  );
}